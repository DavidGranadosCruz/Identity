import { GenerationStatus, JobStatus, JobType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export class GenerationRepository {
  async createGeneration(params: {
    userId: string;
    packId: string;
    referenceImageId: string;
    referenceFidelity: number;
    identityStrength: number;
    selectedIdentityImageIds?: string[];
  }) {
    return prisma.generation.create({
      data: {
        userId: params.userId,
        packId: params.packId,
        referenceImageId: params.referenceImageId,
        referenceFidelity: params.referenceFidelity,
        identityStrength: params.identityStrength,
        selectedIdentityImagesJson: params.selectedIdentityImageIds ?? Prisma.JsonNull,
      },
    });
  }

  async listByUser(userId: string) {
    return prisma.generation.findMany({
      where: { userId },
      include: {
        variants: true,
        referenceImage: true,
        pack: {
          include: {
            profile: true,
          },
        },
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByIdForUser(generationId: string, userId: string) {
    return prisma.generation.findFirst({
      where: { id: generationId, userId },
      include: {
        variants: { orderBy: { createdAt: "asc" } },
        referenceImage: true,
        pack: {
          include: {
            profile: true,
          },
        },
        jobs: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async findById(generationId: string) {
    return prisma.generation.findUnique({
      where: { id: generationId },
      include: {
        variants: { orderBy: { createdAt: "asc" } },
        referenceImage: true,
        pack: {
          include: {
            profile: true,
          },
        },
      },
    });
  }

  async updateTitleForUser(generationId: string, userId: string, title: string) {
    const existing = await prisma.generation.findFirst({
      where: { id: generationId, userId },
      select: { id: true },
    });

    if (!existing) {
      return null;
    }

    return prisma.generation.update({
      where: { id: generationId },
      data: { title },
    });
  }

  async findForDeleteByUser(generationId: string, userId: string) {
    return prisma.generation.findFirst({
      where: { id: generationId, userId },
      include: {
        variants: {
          select: {
            id: true,
            storagePath: true,
          },
        },
      },
    });
  }

  async deleteById(generationId: string) {
    await prisma.generation.delete({
      where: { id: generationId },
    });
  }

  async updateGenerationStatus(params: {
    generationId: string;
    status: GenerationStatus;
    errorMessage?: string | null;
    provider?: string;
    providerModel?: string;
    promptJson?: Prisma.InputJsonValue;
    selectedIdentityImagesJson?: Prisma.InputJsonValue;
  }) {
    return prisma.generation.update({
      where: { id: params.generationId },
      data: {
        status: params.status,
        errorMessage: params.errorMessage,
        provider: params.provider,
        providerModel: params.providerModel,
        promptJson: params.promptJson,
        selectedIdentityImagesJson: params.selectedIdentityImagesJson,
      },
    });
  }

  async addVariants(
    generationId: string,
    variants: Array<{
      variantType: "faithful" | "editorial" | "cinematic";
      storagePath: string;
      mimeType: string;
      width: number;
      height: number;
      fileSize: number;
      identitySimilarityScore: number;
      referenceCompositionScore: number;
      backgroundPreservationScore: number;
      poseMatchScore: number;
      overallAcceptanceScore: number;
      accepted: boolean;
      rejectionReason?: string | null;
      metadataJson: Prisma.InputJsonValue;
    }>,
  ) {
    return prisma.$transaction(
      variants.map((variant) =>
        prisma.generationVariant.create({
          data: {
            generationId,
            variantType: variant.variantType,
            storagePath: variant.storagePath,
            mimeType: variant.mimeType,
            width: variant.width,
            height: variant.height,
            fileSize: variant.fileSize,
            identitySimilarityScore: variant.identitySimilarityScore,
            referenceCompositionScore: variant.referenceCompositionScore,
            backgroundPreservationScore: variant.backgroundPreservationScore,
            poseMatchScore: variant.poseMatchScore,
            overallAcceptanceScore: variant.overallAcceptanceScore,
            accepted: variant.accepted,
            rejectionReason: variant.rejectionReason,
            metadataJson: variant.metadataJson,
          },
        }),
      ),
    );
  }

  async listPackImages(packId: string) {
    return prisma.identityPackImage.findMany({
      where: { packId },
      orderBy: { createdAt: "asc" },
    });
  }

  async findStuckGenerations() {
    return prisma.generation.findMany({
      where: {
        status: {
          in: [GenerationStatus.queued, GenerationStatus.processing],
        },
        jobs: {
          some: {
            type: JobType.generate_recreation,
            status: JobStatus.failed,
          },
          none: {
            type: JobType.generate_recreation,
            status: {
              in: [JobStatus.pending, JobStatus.running],
            },
          },
        },
      },
      select: {
        id: true,
        jobs: {
          where: {
            type: JobType.generate_recreation,
            status: JobStatus.failed,
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
          select: {
            errorMessage: true,
          },
        },
      },
    });
  }
}
