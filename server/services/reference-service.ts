import { mapReferenceImage } from "@/server/mappers/domain-mappers";
import { ReferenceRepository } from "@/server/repositories/reference-repository";
import { JobService } from "@/server/services/job-service";
import { buildStoragePath, uploadToStorage } from "@/lib/storage/storage-service";
import type { UploadedImage } from "@/lib/storage/image-file";

const referenceRepository = new ReferenceRepository();
const jobService = new JobService();

export class ReferenceService {
  async uploadReference(params: { userId: string; file: UploadedImage }) {
    const storagePath = buildStoragePath({
      userId: params.userId,
      category: "reference",
      filename: params.file.originalFilename,
    });

    await uploadToStorage({
      bucket: "uploads",
      storagePath,
      body: params.file.buffer,
      contentType: params.file.mimeType,
    });

    const reference = await referenceRepository.create({
      userId: params.userId,
      storagePath,
      originalFilename: params.file.originalFilename,
      mimeType: params.file.mimeType,
      width: params.file.width,
      height: params.file.height,
      fileSize: params.file.fileSize,
    });

    const analyzeJob = await jobService.enqueueReferenceImageAnalysisJob(params.userId, reference.id);

    return {
      reference: await mapReferenceImage(reference),
      analyzeJob,
    };
  }

  async getLatestReference(userId: string) {
    const reference = await referenceRepository.findLatestByUser(userId);
    if (!reference) return null;
    return mapReferenceImage(reference);
  }

  async findByIdForUser(referenceId: string, userId: string) {
    const reference = await referenceRepository.findByIdForUser(referenceId, userId);
    if (!reference) return null;
    return mapReferenceImage(reference);
  }
}

