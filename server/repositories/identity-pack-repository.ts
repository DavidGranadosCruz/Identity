import { AnalysisStatus, IdentityPackStatus, KeepRecommendation, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export class IdentityPackRepository {
  async listByUser(userId: string) {
    return prisma.identityPack.findMany({
      where: { userId },
      include: {
        profile: true,
        _count: {
          select: {
            images: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createPack(params: { userId: string; name: string }) {
    return prisma.identityPack.create({
      data: {
        userId: params.userId,
        name: params.name,
      },
    });
  }

  async findByIdForUser(packId: string, userId: string) {
    return prisma.identityPack.findFirst({
      where: { id: packId, userId },
      include: { profile: true },
    });
  }

  async findLatestByUser(userId: string) {
    return prisma.identityPack.findFirst({
      where: { userId },
      include: { profile: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async renamePack(packId: string, userId: string, name: string) {
    void userId;
    return prisma.identityPack.update({
      where: { id: packId },
      data: { name },
      include: { profile: true },
    });
  }

  async updatePackStatus(packId: string, status: IdentityPackStatus) {
    return prisma.identityPack.update({
      where: { id: packId },
      data: { status },
      include: { profile: true },
    });
  }

  async listImages(packId: string) {
    return prisma.identityPackImage.findMany({
      where: { packId },
      orderBy: { createdAt: "asc" },
    });
  }

  async countImages(packId: string) {
    return prisma.identityPackImage.count({ where: { packId } });
  }

  async createImages(
    packId: string,
    images: Array<{
      storagePath: string;
      originalFilename: string;
      mimeType: string;
      width: number;
      height: number;
      fileSize: number;
    }>,
  ) {
    const created = await prisma.$transaction(
      images.map((image) =>
        prisma.identityPackImage.create({
          data: {
            packId,
            storagePath: image.storagePath,
            originalFilename: image.originalFilename,
            mimeType: image.mimeType,
            width: image.width,
            height: image.height,
            fileSize: image.fileSize,
          },
        }),
      ),
    );

    return created;
  }

  async markImageRunning(imageId: string) {
    return prisma.identityPackImage.update({
      where: { id: imageId },
      data: {
        analysisStatus: AnalysisStatus.running,
        errorMessage: null,
      },
    });
  }

  async updateImageAnalysis(params: {
    imageId: string;
    score: number;
    keepRecommendation: KeepRecommendation;
    analysisJson: Prisma.InputJsonValue;
  }) {
    return prisma.identityPackImage.update({
      where: { id: params.imageId },
      data: {
        analysisStatus: AnalysisStatus.completed,
        score: params.score,
        keepRecommendation: params.keepRecommendation,
        analysisJson: params.analysisJson,
        errorMessage: null,
      },
    });
  }

  async applyIdentityConsistency(packId: string, updates: Array<{
    imageId: string;
    identityClusterId: string | null;
    identityConsistencyScore: number | null;
    isIdentityValid: boolean;
    identityDecisionReason: string;
  }>) {
    return prisma.$transaction(
      updates.map((update) =>
        prisma.identityPackImage.update({
          where: { id: update.imageId },
          data: {
            identityClusterId: update.identityClusterId,
            identityConsistencyScore: update.identityConsistencyScore,
            isIdentityValid: update.isIdentityValid,
            identityDecisionReason: update.identityDecisionReason,
          },
        }),
      ),
    );
  }

  async upsertIdentityProfile(params: {
    packId: string;
    status: AnalysisStatus;
    minRequiredImages: number;
    validImageCount: number;
    rejectedImageCount: number;
    consistencyScore: number | null;
    primaryClusterId: string | null;
    centroidVectorJson: Prisma.InputJsonValue | null;
    profileJson: Prisma.InputJsonValue | null;
    errorMessage: string | null;
  }) {
    return prisma.identityProfile.upsert({
      where: { packId: params.packId },
      update: {
        status: params.status,
        minRequiredImages: params.minRequiredImages,
        validImageCount: params.validImageCount,
        rejectedImageCount: params.rejectedImageCount,
        consistencyScore: params.consistencyScore,
        primaryClusterId: params.primaryClusterId,
        centroidVectorJson: params.centroidVectorJson ?? Prisma.JsonNull,
        profileJson: params.profileJson ?? Prisma.JsonNull,
        errorMessage: params.errorMessage,
      },
      create: {
        packId: params.packId,
        status: params.status,
        minRequiredImages: params.minRequiredImages,
        validImageCount: params.validImageCount,
        rejectedImageCount: params.rejectedImageCount,
        consistencyScore: params.consistencyScore,
        primaryClusterId: params.primaryClusterId,
        centroidVectorJson: params.centroidVectorJson ?? Prisma.JsonNull,
        profileJson: params.profileJson ?? Prisma.JsonNull,
        errorMessage: params.errorMessage,
      },
    });
  }

  async findIdentityProfile(packId: string) {
    return prisma.identityProfile.findUnique({
      where: { packId },
    });
  }

  async markImageFailed(imageId: string, errorMessage: string) {
    return prisma.identityPackImage.update({
      where: { id: imageId },
      data: {
        analysisStatus: AnalysisStatus.failed,
        errorMessage,
      },
    });
  }

  async getImageWithPack(imageId: string) {
    return prisma.identityPackImage.findUnique({
      where: { id: imageId },
      include: { pack: { include: { profile: true } } },
    });
  }

  async deleteImage(imageId: string) {
    return prisma.identityPackImage.delete({
      where: { id: imageId },
    });
  }

  async findForDeleteByUser(packId: string, userId: string) {
    return prisma.identityPack.findFirst({
      where: { id: packId, userId },
      include: {
        images: {
          select: {
            id: true,
            storagePath: true,
          },
        },
        generations: {
          select: {
            id: true,
            variants: {
              select: {
                id: true,
                storagePath: true,
              },
            },
          },
        },
      },
    });
  }

  async deletePack(packId: string) {
    return prisma.identityPack.delete({
      where: { id: packId },
    });
  }
}
