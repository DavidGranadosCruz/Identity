import { JobStatus, JobType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function mergeJsonPayload(
  left: Prisma.JsonValue | null,
  right: Prisma.InputJsonValue | undefined,
): Prisma.InputJsonValue {
  const leftObject = left && typeof left === "object" && !Array.isArray(left) ? (left as Record<string, unknown>) : {};
  const rightObject = right && typeof right === "object" && !Array.isArray(right) ? (right as Record<string, unknown>) : {};

  return {
    ...leftObject,
    ...rightObject,
  } as Prisma.InputJsonValue;
}

export class JobRepository {
  create(params: {
    type: JobType;
    userId?: string;
    generationId?: string;
    payloadJson: Prisma.InputJsonValue;
    runAt?: Date;
    maxAttempts?: number;
  }) {
    return prisma.job.create({
      data: {
        type: params.type,
        userId: params.userId,
        generationId: params.generationId,
        payloadJson: params.payloadJson,
        runAt: params.runAt,
        maxAttempts: params.maxAttempts,
      },
    });
  }

  createMany(
    items: Array<{
      type: JobType;
      userId?: string;
      generationId?: string;
      payloadJson: Prisma.InputJsonValue;
      runAt?: Date;
      maxAttempts?: number;
    }>,
  ) {
    return prisma.$transaction(
      items.map((item) =>
        prisma.job.create({
          data: {
            type: item.type,
            userId: item.userId,
            generationId: item.generationId,
            payloadJson: item.payloadJson,
            runAt: item.runAt,
            maxAttempts: item.maxAttempts,
          },
        }),
      ),
    );
  }

  async findById(jobId: string) {
    return prisma.job.findUnique({ where: { id: jobId } });
  }

  async listByGeneration(generationId: string) {
    return prisma.job.findMany({
      where: { generationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async claimNext(workerId: string) {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      WITH next_job AS (
        SELECT id
        FROM "Job"
        WHERE status = 'pending'
          AND "runAt" <= NOW()
        ORDER BY
          CASE type
            WHEN 'generate_recreation' THEN 0
            WHEN 'analyze_reference_image' THEN 1
            ELSE 2
          END ASC,
          "runAt" ASC,
          "createdAt" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE "Job" j
      SET status = 'running',
          "lockedAt" = NOW(),
          "lockedBy" = ${workerId},
          "errorMessage" = NULL,
          "updatedAt" = NOW()
      FROM next_job
      WHERE j.id = next_job.id
      RETURNING j.id;
    `;

    if (!rows.length) return null;
    return prisma.job.findUnique({ where: { id: rows[0].id } });
  }

  async complete(jobId: string, resultJson?: Prisma.InputJsonValue) {
    const current = await prisma.job.findUnique({
      where: { id: jobId },
      select: { resultJson: true },
    });

    const mergedResult = mergeJsonPayload(current?.resultJson ?? null, resultJson);

    return prisma.job.update({
      where: { id: jobId },
      data: {
        status: JobStatus.completed,
        resultJson: mergedResult,
        errorMessage: null,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }

  async updateRunningProgress(jobId: string, progress: Prisma.InputJsonValue) {
    const current = await prisma.job.findUnique({
      where: { id: jobId },
      select: { resultJson: true },
    });

    const mergedResult = mergeJsonPayload(current?.resultJson ?? null, progress);

    return prisma.job.update({
      where: { id: jobId },
      data: {
        resultJson: mergedResult,
      },
    });
  }

  async fail(jobId: string, errorMessage: string, shouldRetry: boolean, retryAt?: Date) {
    const current = await prisma.job.findUnique({ where: { id: jobId } });
    if (!current) return null;

    const nextAttempts = current.attempts + 1;

    return prisma.job.update({
      where: { id: jobId },
      data: {
        attempts: nextAttempts,
        status: shouldRetry ? JobStatus.pending : JobStatus.failed,
        runAt: shouldRetry && retryAt ? retryAt : current.runAt,
        errorMessage,
        lockedAt: null,
        lockedBy: null,
      },
    });
  }
}

