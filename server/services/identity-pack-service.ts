import { AnalysisStatus, IdentityPackStatus } from "@prisma/client";
import { appConfig } from "@/lib/utils/config";
import { buildStoragePath, deleteFromStorage, uploadToStorage } from "@/lib/storage/storage-service";
import type { UploadedImage } from "@/lib/storage/image-file";
import { AppError } from "@/lib/utils/errors";
import { mapIdentityPack, mapIdentityPackImage, mapIdentityProfile } from "@/server/mappers/domain-mappers";
import { IdentityPackRepository } from "@/server/repositories/identity-pack-repository";
import { JobService } from "@/server/services/job-service";
import { IdentityProfileService } from "@/server/services/identity-profile-service";
import type { IdentityPackSummary } from "@/types/domain";

const identityPackRepository = new IdentityPackRepository();
const identityProfileService = new IdentityProfileService();
const jobService = new JobService();

export class IdentityPackService {
  private buildPackSummary(
    row: Awaited<ReturnType<IdentityPackRepository["listByUser"]>>[number],
  ): IdentityPackSummary {
    const profile = row.profile ? mapIdentityProfile(row.profile) : null;
    const imageCount = row._count.images;
    const minRequiredImages = profile?.minRequiredImages ?? 4;
    const validImageCount = profile?.validImageCount ?? 0;
    const isReady =
      row.status === IdentityPackStatus.ready &&
      profile?.status === AnalysisStatus.completed &&
      validImageCount >= minRequiredImages &&
      imageCount > 0;

    let statusLabel: IdentityPackSummary["statusLabel"] = "pending";
    let statusReason: IdentityPackSummary["statusReason"] = "analyzing";

    if (isReady) {
      statusLabel = "ready";
      statusReason = "ready";
    } else if (!imageCount) {
      statusLabel = "pending";
      statusReason = "empty";
    } else if (row.status === IdentityPackStatus.failed || profile?.status === AnalysisStatus.failed) {
      statusLabel = "blocked";
      statusReason = "failed";
    } else if (profile?.status === AnalysisStatus.completed && validImageCount < minRequiredImages) {
      statusLabel = "blocked";
      statusReason = "insufficient_valid_images";
    } else if (!profile) {
      statusLabel = "pending";
      statusReason = "profile_not_ready";
    }

    return {
      pack: mapIdentityPack(row),
      profile,
      imageCount,
      validImageCount,
      minRequiredImages,
      readyForGeneration: isReady,
      statusLabel,
      statusReason,
    };
  }

  async listPackSummaries(userId: string) {
    const rows = await identityPackRepository.listByUser(userId);
    return rows.map((row) => this.buildPackSummary(row));
  }

  async createPack(params: { userId: string; name: string }) {
    const created = await identityPackRepository.createPack({
      userId: params.userId,
      name: params.name,
    });
    return mapIdentityPack(created);
  }

  async deletePack(params: { userId: string; packId: string }) {
    const row = await identityPackRepository.findForDeleteByUser(params.packId, params.userId);
    if (!row) {
      throw new AppError("PACK_NOT_FOUND", "Identity Pack no encontrado", 404);
    }

    for (const image of row.images) {
      await deleteFromStorage({
        bucket: "uploads",
        storagePath: image.storagePath,
      }).catch(() => undefined);
    }

    for (const generation of row.generations) {
      for (const variant of generation.variants) {
        await deleteFromStorage({
          bucket: "generations",
          storagePath: variant.storagePath,
        }).catch(() => undefined);
      }
    }

    await identityPackRepository.deletePack(row.id);
    return { deletedPackId: row.id };
  }

  async uploadImages(params: {
    userId: string;
    name: string;
    packId?: string;
    files: UploadedImage[];
  }) {
    if (!params.files.length) {
      throw new AppError("FILES_REQUIRED", "Debes subir al menos una imagen", 422);
    }

    const pack = params.packId
      ? await identityPackRepository.findByIdForUser(params.packId, params.userId)
      : await identityPackRepository.findLatestByUser(params.userId);

    const targetPack =
      pack ??
      (await identityPackRepository.createPack({
        userId: params.userId,
        name: params.name,
      }));

    const existingCount = await identityPackRepository.countImages(targetPack.id);
    if (existingCount + params.files.length > appConfig.maxIdentityImages) {
      throw new AppError(
        "MAX_IDENTITY_IMAGES_EXCEEDED",
        `No puedes superar ${appConfig.maxIdentityImages} imagenes en el Identity Pack`,
        422,
      );
    }

    await identityPackRepository.updatePackStatus(targetPack.id, IdentityPackStatus.analyzing);

    const uploads = await Promise.all(
      params.files.map(async (file) => {
        const storagePath = buildStoragePath({
          userId: params.userId,
          category: "identity",
          filename: file.originalFilename,
        });

        await uploadToStorage({
          bucket: "uploads",
          storagePath,
          body: file.buffer,
          contentType: file.mimeType,
        });

        return {
          storagePath,
          originalFilename: file.originalFilename,
          mimeType: file.mimeType,
          width: file.width,
          height: file.height,
          fileSize: file.fileSize,
        };
      }),
    );

    const createdImages = await identityPackRepository.createImages(targetPack.id, uploads);

    const jobs = await jobService.enqueueIdentityImageAnalysisJobs(
      params.userId,
      createdImages.map((image) => image.id),
    );

    const mappedImages = await Promise.all(createdImages.map(mapIdentityPackImage));

    return {
      pack: mapIdentityPack(targetPack),
      images: mappedImages,
      jobs,
    };
  }

  async requeueAnalysis(params: { userId: string; packId: string; imageIds?: string[] }) {
    const pack = await identityPackRepository.findByIdForUser(params.packId, params.userId);

    if (!pack) {
      throw new AppError("PACK_NOT_FOUND", "Identity Pack no encontrado", 404);
    }

    const images = await identityPackRepository.listImages(pack.id);
    const targetImageIds =
      params.imageIds && params.imageIds.length
        ? images.filter((image) => params.imageIds?.includes(image.id)).map((image) => image.id)
        : images.map((image) => image.id);

    if (!targetImageIds.length) {
      throw new AppError("IMAGES_NOT_FOUND", "No hay imagenes para analizar", 404);
    }

    await identityPackRepository.updatePackStatus(pack.id, IdentityPackStatus.analyzing);

    const jobs = await jobService.enqueueIdentityImageAnalysisJobs(params.userId, targetImageIds);

    return {
      queued: targetImageIds.length,
      jobs,
    };
  }

  async renamePack(params: { userId: string; packId: string; name: string }) {
    const pack = await identityPackRepository.findByIdForUser(params.packId, params.userId);

    if (!pack) {
      throw new AppError("PACK_NOT_FOUND", "Identity Pack no encontrado", 404);
    }

    const updated = await identityPackRepository.renamePack(params.packId, params.userId, params.name);
    return mapIdentityPack(updated);
  }

  async deleteImage(params: { userId: string; packId: string; imageId: string }) {
    const pack = await identityPackRepository.findByIdForUser(params.packId, params.userId);

    if (!pack) {
      throw new AppError("PACK_NOT_FOUND", "Identity Pack no encontrado", 404);
    }

    const image = await identityPackRepository.getImageWithPack(params.imageId);
    if (!image || image.packId !== params.packId) {
      throw new AppError("IMAGE_NOT_FOUND", "Imagen no encontrada en el pack", 404);
    }

    await identityPackRepository.deleteImage(params.imageId);

    await deleteFromStorage({
      bucket: "uploads",
      storagePath: image.storagePath,
    }).catch(() => undefined);

    await this.refreshPackStatus(pack.id);

    return { deletedImageId: params.imageId };
  }

  async refreshPackStatus(packId: string) {
    const images = await identityPackRepository.listImages(packId);

    if (!images.length) {
      await identityPackRepository.updatePackStatus(packId, IdentityPackStatus.draft);
      return IdentityPackStatus.draft;
    }

    if (images.some((image) => image.analysisStatus === AnalysisStatus.running || image.analysisStatus === AnalysisStatus.pending)) {
      await identityPackRepository.updatePackStatus(packId, IdentityPackStatus.analyzing);
      return IdentityPackStatus.analyzing;
    }

    if (images.some((image) => image.analysisStatus === AnalysisStatus.failed)) {
      await identityPackRepository.updatePackStatus(packId, IdentityPackStatus.failed);
      return IdentityPackStatus.failed;
    }

    const profile = await identityProfileService.rebuildForPack(packId);
    if (profile.status !== AnalysisStatus.completed) {
      await identityPackRepository.updatePackStatus(packId, IdentityPackStatus.failed);
      return IdentityPackStatus.failed;
    }

    await identityPackRepository.updatePackStatus(packId, IdentityPackStatus.ready);
    return IdentityPackStatus.ready;
  }

  async getLatestPackWithImages(userId: string) {
    const workspace = await this.getPackWorkspace(userId);
    return workspace.packData;
  }

  async getPackWithImages(userId: string, packId: string) {
    const pack = await identityPackRepository.findByIdForUser(packId, userId);
    if (!pack) return null;

    await this.refreshPackStatus(pack.id);

    const refreshed = await identityPackRepository.findByIdForUser(pack.id, userId);
    if (!refreshed) return null;

    const images = await identityPackRepository.listImages(refreshed.id);
    const profile = await identityPackRepository.findIdentityProfile(refreshed.id);

    return {
      pack: mapIdentityPack(refreshed),
      profile: profile ? mapIdentityProfile(profile) : null,
      images: await Promise.all(images.map(mapIdentityPackImage)),
    };
  }

  async getPackWorkspace(userId: string, selectedPackId?: string | null) {
    const summaries = await this.listPackSummaries(userId);
    if (!summaries.length) {
      return {
        packs: [] as IdentityPackSummary[],
        selectedPackId: null as string | null,
        packData: null,
      };
    }

    const defaultSelectedPackId = selectedPackId && summaries.some((item) => item.pack.id === selectedPackId)
      ? selectedPackId
      : summaries[0]?.pack.id ?? null;

    const packData = defaultSelectedPackId
      ? await this.getPackWithImages(userId, defaultSelectedPackId)
      : null;

    const mergedSummaries = summaries.map((summary) => {
      if (!packData || summary.pack.id !== packData.pack.id) return summary;
      const minRequiredImages = packData.profile?.minRequiredImages ?? 4;
      const validImageCount = packData.profile?.validImageCount ?? 0;
      const isReady =
        packData.pack.status === "ready" &&
        packData.profile?.status === "completed" &&
        validImageCount >= minRequiredImages &&
        packData.images.length > 0;

      return {
        pack: packData.pack,
        profile: packData.profile,
        imageCount: packData.images.length,
        validImageCount,
        minRequiredImages,
        readyForGeneration: isReady,
        statusLabel: isReady
          ? ("ready" as const)
          : packData.images.length === 0
            ? ("pending" as const)
            : packData.pack.status === "failed" || packData.profile?.status === "failed"
              ? ("blocked" as const)
              : packData.profile?.status === "completed" && validImageCount < minRequiredImages
                ? ("blocked" as const)
                : ("pending" as const),
        statusReason: isReady
          ? ("ready" as const)
          : packData.images.length === 0
            ? ("empty" as const)
            : packData.pack.status === "failed" || packData.profile?.status === "failed"
              ? ("failed" as const)
              : packData.profile?.status === "completed" && validImageCount < minRequiredImages
                ? ("insufficient_valid_images" as const)
                : ("analyzing" as const),
      };
    });

    return {
      packs: mergedSummaries,
      selectedPackId: defaultSelectedPackId,
      packData,
    };
  }
}
