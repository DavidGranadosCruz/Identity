import type {
  Generation,
  GenerationVariant,
  IdentityProfile,
  IdentityPack,
  IdentityPackImage,
  Job,
  ReferenceImage,
  UserSettings,
} from "@prisma/client";
import type {
  Generation as DomainGeneration,
  GenerationBundle,
  GenerationVariant as DomainGenerationVariant,
  IdentityProfile as DomainIdentityProfile,
  IdentityPack as DomainIdentityPack,
  IdentityPackImage as DomainIdentityPackImage,
  Job as DomainJob,
  ReferenceImage as DomainReferenceImage,
  UserSettings as DomainUserSettings,
} from "@/types/domain";

function buildStorageProxyUrl(bucket: "uploads" | "generations", storagePath: string) {
  const encodedPath = storagePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `/api/storage/${bucket}/${encodedPath}`;
}

export function mapIdentityPack(pack: IdentityPack): DomainIdentityPack {
  return {
    id: pack.id,
    userId: pack.userId,
    name: pack.name,
    status: pack.status,
    createdAt: pack.createdAt.toISOString(),
    updatedAt: pack.updatedAt.toISOString(),
  };
}

export function mapIdentityPackImage(image: IdentityPackImage): DomainIdentityPackImage {
  return {
    id: image.id,
    packId: image.packId,
    storagePath: image.storagePath,
    imageUrl: buildStorageProxyUrl("uploads", image.storagePath),
    originalFilename: image.originalFilename,
    mimeType: image.mimeType,
    width: image.width,
    height: image.height,
    fileSize: image.fileSize,
    analysisStatus: image.analysisStatus,
    score: image.score,
    keepRecommendation: image.keepRecommendation,
    analysisJson: image.analysisJson as DomainIdentityPackImage["analysisJson"],
    identityClusterId: image.identityClusterId,
    identityConsistencyScore: image.identityConsistencyScore,
    isIdentityValid: image.isIdentityValid,
    identityDecisionReason: image.identityDecisionReason,
    errorMessage: image.errorMessage,
    createdAt: image.createdAt.toISOString(),
    updatedAt: image.updatedAt.toISOString(),
  };
}

export function mapReferenceImage(reference: ReferenceImage): DomainReferenceImage {
  return {
    id: reference.id,
    userId: reference.userId,
    storagePath: reference.storagePath,
    imageUrl: buildStorageProxyUrl("uploads", reference.storagePath),
    originalFilename: reference.originalFilename,
    mimeType: reference.mimeType,
    width: reference.width,
    height: reference.height,
    fileSize: reference.fileSize,
    analysisStatus: reference.analysisStatus,
    analysisJson: reference.analysisJson as DomainReferenceImage["analysisJson"],
    errorMessage: reference.errorMessage,
    createdAt: reference.createdAt.toISOString(),
    updatedAt: reference.updatedAt.toISOString(),
  };
}

export function mapGeneration(generation: Generation): DomainGeneration {
  return {
    id: generation.id,
    userId: generation.userId,
    packId: generation.packId,
    referenceImageId: generation.referenceImageId,
    title: generation.title,
    status: generation.status,
    referenceFidelity: generation.referenceFidelity,
    identityStrength: generation.identityStrength,
    promptJson: generation.promptJson as DomainGeneration["promptJson"],
    selectedIdentityImagesJson: generation.selectedIdentityImagesJson as DomainGeneration["selectedIdentityImagesJson"],
    provider: generation.provider,
    providerModel: generation.providerModel,
    errorMessage: generation.errorMessage,
    createdAt: generation.createdAt.toISOString(),
    updatedAt: generation.updatedAt.toISOString(),
  };
}

export function mapGenerationVariant(variant: GenerationVariant): DomainGenerationVariant {
  return {
    id: variant.id,
    generationId: variant.generationId,
    variantType: variant.variantType,
    storagePath: variant.storagePath,
    imageUrl: buildStorageProxyUrl("generations", variant.storagePath),
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
    metadataJson: variant.metadataJson as DomainGenerationVariant["metadataJson"],
    createdAt: variant.createdAt.toISOString(),
  };
}

export function mapIdentityProfile(profile: IdentityProfile): DomainIdentityProfile {
  return {
    id: profile.id,
    packId: profile.packId,
    status: profile.status,
    minRequiredImages: profile.minRequiredImages,
    validImageCount: profile.validImageCount,
    rejectedImageCount: profile.rejectedImageCount,
    consistencyScore: profile.consistencyScore,
    primaryClusterId: profile.primaryClusterId,
    centroidVectorJson: profile.centroidVectorJson as number[] | null,
    profileJson: profile.profileJson as Record<string, unknown> | null,
    errorMessage: profile.errorMessage,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export function mapJob(job: Job): DomainJob {
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    payloadJson: job.payloadJson as Record<string, unknown>,
    resultJson: job.resultJson as Record<string, unknown> | null,
    errorMessage: job.errorMessage,
    attempts: job.attempts,
    runAt: job.runAt.toISOString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

export function mapUserSettings(settings: UserSettings): DomainUserSettings {
  const themePreference =
    settings.themePreference === "light" || settings.themePreference === "dark"
      ? settings.themePreference
      : "system";
  const languagePreference = settings.languagePreference === "en" ? "en" : "es";

  return {
    id: settings.id,
    userId: settings.userId,
    defaultFidelity: settings.defaultFidelity,
    defaultIdentityStrength: settings.defaultIdentityStrength,
    watermarkEnabled: settings.watermarkEnabled,
    themePreference,
    languagePreference,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function mapGenerationBundle(params: {
  generation: Generation;
  variants: GenerationVariant[];
  reference: ReferenceImage;
  selectedIdentityImages: DomainIdentityPackImage[];
  identityProfile: DomainIdentityProfile | null;
  jobs: Job[];
}): Promise<GenerationBundle> {
  return {
    generation: mapGeneration(params.generation),
    variants: params.variants.map(mapGenerationVariant),
    reference: mapReferenceImage(params.reference),
    selectedIdentityImages: params.selectedIdentityImages,
    identityProfile: params.identityProfile,
    jobs: params.jobs.map(mapJob),
  };
}
