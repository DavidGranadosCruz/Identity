import { AnalysisStatus, GenerationStatus, Prisma } from "@prisma/client";
import { referenceAnalysisSchema } from "@/lib/ai/schemas/reference-analysis-schema";
import { deleteFromStorage } from "@/lib/storage/storage-service";
import { AppError } from "@/lib/utils/errors";
import { mapGeneration, mapGenerationBundle, mapIdentityPackImage, mapIdentityProfile } from "@/server/mappers/domain-mappers";
import { GenerationRepository } from "@/server/repositories/generation-repository";
import { IdentityPackRepository } from "@/server/repositories/identity-pack-repository";
import { ReferenceRepository } from "@/server/repositories/reference-repository";
import { JobService } from "@/server/services/job-service";
import { IdentityProfileService } from "@/server/services/identity-profile-service";
import type { GenerationRequest, ReferenceAnalysis } from "@/types/domain";

const generationRepository = new GenerationRepository();
const identityPackRepository = new IdentityPackRepository();
const referenceRepository = new ReferenceRepository();
const identityProfileService = new IdentityProfileService();
const jobService = new JobService();

function asReferenceAnalysis(value: unknown): ReferenceAnalysis | null {
  const parsed = referenceAnalysisSchema.safeParse(value);
  if (!parsed.success) return null;
  return parsed.data;
}

export class GenerationService {
  async createGeneration(userId: string, payload: GenerationRequest) {
    const pack = await identityPackRepository.findByIdForUser(payload.packId, userId);
    if (!pack) {
      throw new AppError("PACK_NOT_FOUND", "Identity Pack invalido", 404);
    }

    const profile = await identityProfileService.requireReadyProfile(pack.id);

    const reference = await referenceRepository.findByIdForUser(payload.referenceImageId, userId);
    if (!reference) {
      throw new AppError("REFERENCE_NOT_FOUND", "Referencia invalida", 404);
    }

    if (reference.analysisStatus !== AnalysisStatus.completed) {
      throw new AppError("REFERENCE_NOT_READY", "La referencia aun no esta analizada", 422);
    }

    const referenceAnalysis = asReferenceAnalysis(reference.analysisJson);
    if (!referenceAnalysis) {
      throw new AppError("REFERENCE_NOT_READY", "La referencia no tiene analisis estructurado valido", 422);
    }

    if (!referenceAnalysis.singlePersonClear || !referenceAnalysis.primaryFaceVisible || referenceAnalysis.subjectCount !== 1) {
      throw new AppError(
        "REFERENCE_NOT_SUPPORTED",
        "La referencia debe contener una sola persona con rostro visible para preservar identidad.",
        422,
      );
    }

    if (referenceAnalysis.referenceQuality === "low") {
      throw new AppError("REFERENCE_QUALITY_LOW", "La referencia tiene calidad insuficiente para recreacion confiable", 422);
    }

    const packImages = await identityPackRepository.listImages(pack.id);
    if (!packImages.length) {
      throw new AppError("INSUFFICIENT_IDENTITY_IMAGES", "No hay imagenes en el Identity Pack", 422);
    }

    const validIdentityImages = packImages.filter((image) => image.isIdentityValid);
    if (validIdentityImages.length < profile.minRequiredImages) {
      throw new AppError(
        "INSUFFICIENT_VALID_IDENTITY_IMAGES",
        `Se requieren al menos ${profile.minRequiredImages} fotos validas de una sola identidad antes de generar.`,
        422,
      );
    }

    const selectedIds = payload.selectedIdentityImageIds?.filter((value): value is string => typeof value === "string") ?? [];

    let finalSelectedIds = selectedIds;
    const targetSelectedCount = Math.min(8, Math.max(profile.minRequiredImages, 6));

    if (selectedIds.length > 0) {
      const selectedFromPack = packImages.filter((image) => selectedIds.includes(image.id));
      if (selectedFromPack.length !== selectedIds.length) {
        throw new AppError("INVALID_IDENTITY_SELECTION", "Seleccionaste imagenes que no existen en tu Identity Pack", 422);
      }

      const invalidManual = selectedFromPack.filter((image) => !image.isIdentityValid);
      if (invalidManual.length) {
        throw new AppError(
          "INVALID_IDENTITY_SELECTION",
          "Seleccionaste imagenes no aptas para identidad. Usa solo las marcadas como validas.",
          422,
        );
      }
    } else {
      finalSelectedIds = validIdentityImages
        .sort((left, right) => {
          const leftScore = (left.identityConsistencyScore ?? 0) * 0.7 + (left.score ?? 0) * 0.3;
          const rightScore = (right.identityConsistencyScore ?? 0) * 0.7 + (right.score ?? 0) * 0.3;
          return rightScore - leftScore;
        })
        .slice(0, targetSelectedCount)
        .map((image) => image.id);
    }

    if (finalSelectedIds.length < profile.minRequiredImages) {
      throw new AppError(
        "INSUFFICIENT_IDENTITY_IMAGES",
        `Debes usar al menos ${profile.minRequiredImages} fotos validas para bloquear bien la identidad.`,
        422,
      );
    }

    const generation = await generationRepository.createGeneration({
      userId,
      packId: payload.packId,
      referenceImageId: payload.referenceImageId,
      referenceFidelity: payload.referenceFidelity,
      identityStrength: payload.identityStrength,
      selectedIdentityImageIds: finalSelectedIds,
    });

    const job = await jobService.enqueueGenerationJob({
      userId,
      generationId: generation.id,
      selectedIdentityImageIds: finalSelectedIds,
    });

    return {
      generationId: generation.id,
      jobId: job.id,
      status: "queued" as const,
    };
  }

  private async resolveSelectedIdentityImages(generation: {
    packId: string;
    selectedIdentityImagesJson: unknown;
  }) {
    const packImages = await generationRepository.listPackImages(generation.packId);

    const selectedIds = Array.isArray(generation.selectedIdentityImagesJson)
      ? generation.selectedIdentityImagesJson.filter((value): value is string => typeof value === "string")
      : [];

    const selected = selectedIds.length
      ? packImages.filter((image) => selectedIds.includes(image.id))
      : packImages
          .filter((image) => image.analysisStatus === AnalysisStatus.completed && image.isIdentityValid)
          .sort((a, b) => {
            const aScore = (a.identityConsistencyScore ?? 0) * 0.7 + (a.score ?? 0) * 0.3;
            const bScore = (b.identityConsistencyScore ?? 0) * 0.7 + (b.score ?? 0) * 0.3;
            return bScore - aScore;
          })
          .slice(0, 8);

    return Promise.all(selected.map(mapIdentityPackImage));
  }

  async listByUser(userId: string) {
    const rows = await generationRepository.listByUser(userId);

    return Promise.all(
      rows.map(async (row) => {
        const selectedIdentityImages = await this.resolveSelectedIdentityImages(row);

        return mapGenerationBundle({
          generation: row,
          variants: row.variants,
          reference: row.referenceImage,
          selectedIdentityImages,
          identityProfile: row.pack.profile ? mapIdentityProfile(row.pack.profile) : null,
          jobs: row.jobs,
        });
      }),
    );
  }

  async getById(userId: string, generationId: string) {
    const row = await generationRepository.findByIdForUser(generationId, userId);

    if (!row) {
      throw new AppError("GENERATION_NOT_FOUND", "Generacion no encontrada", 404);
    }

    const selectedIdentityImages = await this.resolveSelectedIdentityImages(row);

    return mapGenerationBundle({
      generation: row,
      variants: row.variants,
      reference: row.referenceImage,
      selectedIdentityImages,
      identityProfile: row.pack.profile ? mapIdentityProfile(row.pack.profile) : null,
      jobs: row.jobs,
    });
  }

  async updateTitle(userId: string, generationId: string, title: string) {
    const updated = await generationRepository.updateTitleForUser(generationId, userId, title);

    if (!updated) {
      throw new AppError("GENERATION_NOT_FOUND", "Generacion no encontrada", 404);
    }

    return mapGeneration(updated);
  }

  async deleteGeneration(userId: string, generationId: string) {
    const row = await generationRepository.findForDeleteByUser(generationId, userId);

    if (!row) {
      throw new AppError("GENERATION_NOT_FOUND", "Generacion no encontrada", 404);
    }

    for (const variant of row.variants) {
      await deleteFromStorage({
        bucket: "generations",
        storagePath: variant.storagePath,
      });
    }

    await generationRepository.deleteById(row.id);

    return {
      generationId: row.id,
      deletedVariants: row.variants.length,
    };
  }

  async markProcessing(generationId: string) {
    return generationRepository.updateGenerationStatus({
      generationId,
      status: GenerationStatus.processing,
      errorMessage: null,
    });
  }

  async markCompleted(params: {
    generationId: string;
    provider: string;
    providerModel: string;
    promptJson: Prisma.InputJsonValue;
    selectedIdentityImagesJson: Prisma.InputJsonValue;
  }) {
    return generationRepository.updateGenerationStatus({
      generationId: params.generationId,
      status: GenerationStatus.completed,
      provider: params.provider,
      providerModel: params.providerModel,
      promptJson: params.promptJson,
      selectedIdentityImagesJson: params.selectedIdentityImagesJson,
      errorMessage: null,
    });
  }

  async markFailed(generationId: string, errorMessage: string) {
    return generationRepository.updateGenerationStatus({
      generationId,
      status: GenerationStatus.failed,
      errorMessage,
    });
  }

  async reconcileStuckGenerations() {
    const stuck = await generationRepository.findStuckGenerations();
    if (!stuck.length) return 0;

    await Promise.all(
      stuck.map((generation) =>
        generationRepository.updateGenerationStatus({
          generationId: generation.id,
          status: GenerationStatus.failed,
          errorMessage: generation.jobs[0]?.errorMessage ?? "Generation job failed",
        }),
      ),
    );

    return stuck.length;
  }
}
