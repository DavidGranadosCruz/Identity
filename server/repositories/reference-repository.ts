import { AnalysisStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export class ReferenceRepository {
  async create(params: {
    userId: string;
    storagePath: string;
    originalFilename: string;
    mimeType: string;
    width: number;
    height: number;
    fileSize: number;
  }) {
    return prisma.referenceImage.create({
      data: {
        userId: params.userId,
        storagePath: params.storagePath,
        originalFilename: params.originalFilename,
        mimeType: params.mimeType,
        width: params.width,
        height: params.height,
        fileSize: params.fileSize,
      },
    });
  }

  async findByIdForUser(referenceId: string, userId: string) {
    return prisma.referenceImage.findFirst({
      where: { id: referenceId, userId },
    });
  }

  async findById(referenceId: string) {
    return prisma.referenceImage.findUnique({
      where: { id: referenceId },
    });
  }

  async findLatestByUser(userId: string) {
    return prisma.referenceImage.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async markRunning(referenceId: string) {
    return prisma.referenceImage.update({
      where: { id: referenceId },
      data: {
        analysisStatus: AnalysisStatus.running,
        errorMessage: null,
      },
    });
  }

  async completeAnalysis(referenceId: string, analysisJson: Prisma.InputJsonValue) {
    return prisma.referenceImage.update({
      where: { id: referenceId },
      data: {
        analysisStatus: AnalysisStatus.completed,
        analysisJson,
        errorMessage: null,
      },
    });
  }

  async failAnalysis(referenceId: string, errorMessage: string) {
    return prisma.referenceImage.update({
      where: { id: referenceId },
      data: {
        analysisStatus: AnalysisStatus.failed,
        errorMessage,
      },
    });
  }
}

