import { JobType } from "@prisma/client";
import { getEnv } from "@/lib/utils/env";
import { JobRepository } from "@/server/repositories/job-repository";
import { mapJob } from "@/server/mappers/domain-mappers";

const jobRepository = new JobRepository();

export class JobService {
  private resolveMaxAttempts(type: JobType) {
    const env = getEnv();
    if (type === JobType.generate_recreation) {
      return env.JOB_GENERATION_MAX_ATTEMPTS;
    }
    return env.JOB_ANALYSIS_MAX_ATTEMPTS;
  }

  async enqueueIdentityImageAnalysisJobs(userId: string, imageIds: string[]) {
    const jobs = await jobRepository.createMany(
      imageIds.map((imageId) => ({
        type: JobType.analyze_identity_image,
        userId,
        payloadJson: { imageId },
        maxAttempts: this.resolveMaxAttempts(JobType.analyze_identity_image),
      })),
    );

    return jobs.map(mapJob);
  }

  async enqueueReferenceImageAnalysisJob(userId: string, referenceImageId: string) {
    const job = await jobRepository.create({
      type: JobType.analyze_reference_image,
      userId,
      payloadJson: { referenceImageId },
      maxAttempts: this.resolveMaxAttempts(JobType.analyze_reference_image),
    });

    return mapJob(job);
  }

  async enqueueGenerationJob(params: {
    userId: string;
    generationId: string;
    selectedIdentityImageIds?: string[];
  }) {
    const job = await jobRepository.create({
      type: JobType.generate_recreation,
      userId: params.userId,
      generationId: params.generationId,
      payloadJson: {
        generationId: params.generationId,
        selectedIdentityImageIds: params.selectedIdentityImageIds ?? null,
      },
      maxAttempts: this.resolveMaxAttempts(JobType.generate_recreation),
    });

    return mapJob(job);
  }

  async getJob(jobId: string) {
    const job = await jobRepository.findById(jobId);
    return job ? mapJob(job) : null;
  }

  shouldRetry(attempts: number, maxAttempts: number) {
    return attempts < maxAttempts;
  }

  nextRetryDate(attempts: number) {
    const backoffSeconds = Math.min(60, 3 * Math.max(1, attempts));
    return new Date(Date.now() + backoffSeconds * 1000);
  }

  getWorkerConfig() {
    const env = getEnv();
    return {
      pollIntervalMs: env.WORKER_POLL_INTERVAL_MS,
      workerId: env.WORKER_ID,
      maxAttempts: env.JOB_MAX_ATTEMPTS,
      healthPort: env.WORKER_HEALTH_PORT,
    };
  }
}

