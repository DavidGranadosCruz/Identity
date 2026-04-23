import { AnalysisStatus } from "@prisma/client";
import { getEnv } from "@/lib/utils/env";
import { centroid, cosineSimilarity, similarityToScore } from "@/lib/utils/image-scoring";
import { AppError } from "@/lib/utils/errors";
import { IdentityPackRepository } from "@/server/repositories/identity-pack-repository";
import type { IdentityImageAnalysis } from "@/types/domain";

const identityPackRepository = new IdentityPackRepository();

type RawIdentityPackImage = Awaited<ReturnType<IdentityPackRepository["listImages"]>>[number];
type AnalyzedIdentityImage = Omit<RawIdentityPackImage, "analysisJson"> & { analysisJson: IdentityImageAnalysis | null };

type IdentityCluster = {
  id: string;
  imageIds: string[];
  vectors: number[][];
};

function toJsonValue(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

function extractEmbedding(image: AnalyzedIdentityImage) {
  const embedding = image.analysisJson?.multimodal?.identityEmbedding;
  if (!Array.isArray(embedding) || embedding.length < 32) {
    return null;
  }

  const normalized = embedding.filter((value): value is number => Number.isFinite(value));
  return normalized.length >= 32 ? normalized : null;
}

function clusterImages(images: AnalyzedIdentityImage[]) {
  const env = getEnv();
  const clusters: IdentityCluster[] = [];

  for (const image of images) {
    const vector = extractEmbedding(image);
    if (!vector) continue;

    let bestCluster: IdentityCluster | null = null;
    let bestSimilarity = -1;

    for (const cluster of clusters) {
      const center = centroid(cluster.vectors);
      const similarity = cosineSimilarity(vector, center);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestCluster = cluster;
      }
    }

    if (!bestCluster || bestSimilarity < env.IDENTITY_CLUSTER_SIMILARITY_THRESHOLD) {
      clusters.push({
        id: `cluster_${clusters.length + 1}`,
        imageIds: [image.id],
        vectors: [vector],
      });
      continue;
    }

    bestCluster.imageIds.push(image.id);
    bestCluster.vectors.push(vector);
  }

  return clusters;
}

function summarizeIdentityProfile(validImages: AnalyzedIdentityImage[]) {
  const descriptors = validImages
    .map((image) => image.analysisJson?.multimodal?.identityDescriptor?.trim())
    .filter((value): value is string => Boolean(value));

  const descriptorSample = descriptors.slice(0, 5);

  const averageScore =
    validImages.reduce((accumulator, image) => accumulator + (image.score ?? 0), 0) / Math.max(1, validImages.length);

  return {
    descriptorSample,
    averageScore: Math.round(averageScore),
    imageCount: validImages.length,
  };
}

function imageWarnings(image: AnalyzedIdentityImage) {
  const multimodal = image.analysisJson?.multimodal;
  if (!multimodal) return ["Sin analisis multimodal"];

  const warnings: string[] = [];
  if (multimodal.cutoutOrRenderDetected) warnings.push("Recorte/render detectado");
  if (multimodal.watermarkDetected) warnings.push("Marca de agua detectada");
  if (multimodal.blurLevel === "high") warnings.push("Blur alto");
  if (multimodal.extremeProfile) warnings.push("Perfil extremo");
  if (multimodal.faceCount !== 1 || multimodal.multiplePeople) warnings.push("No hay una sola persona clara");
  if (!multimodal.faceVisible) warnings.push("Rostro no visible");
  if (multimodal.facePartiallyCovered) warnings.push("Rostro cubierto parcialmente");

  return warnings;
}

function isImageStrongIdentityCandidate(image: AnalyzedIdentityImage) {
  const warnings = imageWarnings(image);
  const hasBlockingWarning = warnings.some((warning) =>
    ["Recorte/render detectado", "No hay una sola persona clara", "Rostro no visible"].includes(warning),
  );

  return !hasBlockingWarning;
}

export class IdentityProfileService {
  async rebuildForPack(packId: string) {
    const env = getEnv();
    const images = await identityPackRepository.listImages(packId);
    const analyzed = images
      .filter((image) => image.analysisStatus === AnalysisStatus.completed)
      .map((image) => ({
        ...image,
        analysisJson: image.analysisJson as IdentityImageAnalysis | null,
      }));

    if (!analyzed.length) {
      await identityPackRepository.upsertIdentityProfile({
        packId,
        status: AnalysisStatus.pending,
        minRequiredImages: env.IDENTITY_MIN_VALID_IMAGES,
        validImageCount: 0,
        rejectedImageCount: images.length,
        consistencyScore: null,
        primaryClusterId: null,
        centroidVectorJson: null,
        profileJson: null,
        errorMessage: "No hay imagenes analizadas para construir perfil de identidad",
      });

      return {
        status: AnalysisStatus.pending,
        validImageIds: [] as string[],
      };
    }

    const clusters = clusterImages(analyzed);
    const sortedClusters = [...clusters].sort((left, right) => right.imageIds.length - left.imageIds.length);
    const primaryCluster = sortedClusters[0] ?? null;
    const secondaryCluster = sortedClusters[1] ?? null;

    const hasAmbiguousIdentities = Boolean(
      primaryCluster &&
        secondaryCluster &&
        secondaryCluster.imageIds.length >= 2 &&
        secondaryCluster.imageIds.length / primaryCluster.imageIds.length >= 0.6,
    );

    const primaryCentroid = primaryCluster ? centroid(primaryCluster.vectors) : [];
    const updates = analyzed.map((image) => {
      const embedding = extractEmbedding(image);
      const clusterId = clusters.find((cluster) => cluster.imageIds.includes(image.id))?.id ?? null;
      const similarity = embedding && primaryCentroid.length ? cosineSimilarity(embedding, primaryCentroid) : 0;
      const identityConsistencyScore = similarityToScore(similarity);
      const warnings = imageWarnings(image);
      const strongCandidate = isImageStrongIdentityCandidate(image);
      const inPrimary = clusterId !== null && clusterId === primaryCluster?.id;
      const isIdentityValid =
        Boolean(primaryCluster) &&
        !hasAmbiguousIdentities &&
        inPrimary &&
        strongCandidate &&
        identityConsistencyScore >= env.IDENTITY_VALIDITY_SIMILARITY_THRESHOLD;

      const identityDecisionReason = isIdentityValid
        ? `Seleccionada por consistencia (${identityConsistencyScore}/100) y calidad util`
        : inPrimary
          ? `Descartada: ${warnings[0] ?? "consistencia insuficiente"}`
          : "Descartada por pertenecer a otro cluster de identidad";

      return {
        imageId: image.id,
        identityClusterId: clusterId,
        identityConsistencyScore: Number.isFinite(identityConsistencyScore) ? identityConsistencyScore : null,
        isIdentityValid,
        identityDecisionReason,
      };
    });

    await identityPackRepository.applyIdentityConsistency(packId, updates);

    const validImageIds = updates.filter((image) => image.isIdentityValid).map((image) => image.imageId);
    const validImages = analyzed.filter((image) => validImageIds.includes(image.id));
    const rejectedImageCount = analyzed.length - validImageIds.length;
    const consistencyScore = updates
      .filter((item) => item.isIdentityValid && typeof item.identityConsistencyScore === "number")
      .reduce((accumulator, item) => accumulator + (item.identityConsistencyScore ?? 0), 0);

    const averageConsistency = validImageIds.length ? Math.round(consistencyScore / validImageIds.length) : null;

    let status: AnalysisStatus = AnalysisStatus.completed;
    let errorMessage: string | null = null;

    if (hasAmbiguousIdentities) {
      status = AnalysisStatus.failed;
      errorMessage = "Se detectaron multiples identidades en el pack. Usa fotos de una sola persona.";
    } else if (validImageIds.length < env.IDENTITY_MIN_VALID_IMAGES) {
      status = AnalysisStatus.failed;
      errorMessage = `No hay suficientes fotos validas para identidad (minimo ${env.IDENTITY_MIN_VALID_IMAGES}).`;
    }

    await identityPackRepository.upsertIdentityProfile({
      packId,
      status,
      minRequiredImages: env.IDENTITY_MIN_VALID_IMAGES,
      validImageCount: validImageIds.length,
      rejectedImageCount,
      consistencyScore: averageConsistency,
      primaryClusterId: primaryCluster?.id ?? null,
      centroidVectorJson: primaryCentroid.length ? toJsonValue(primaryCentroid) : null,
      profileJson: validImages.length
        ? toJsonValue({
            summary: summarizeIdentityProfile(validImages),
            clusterCount: clusters.length,
            hasAmbiguousIdentities,
            warnings: hasAmbiguousIdentities ? ["Multiple identity clusters detected"] : [],
          })
        : null,
      errorMessage,
    });

    return {
      status,
      validImageIds,
      primaryClusterId: primaryCluster?.id ?? null,
      hasAmbiguousIdentities,
      errorMessage,
    };
  }

  async requireReadyProfile(packId: string) {
    const existing = await identityPackRepository.findIdentityProfile(packId);
    const profile =
      existing ?? (await this.rebuildForPack(packId).then(() => identityPackRepository.findIdentityProfile(packId)));

    if (!profile) {
      throw new AppError("IDENTITY_PROFILE_NOT_READY", "No se pudo construir el perfil de identidad", 422);
    }

    if (profile.status !== AnalysisStatus.completed) {
      throw new AppError(
        "IDENTITY_PROFILE_NOT_READY",
        profile.errorMessage ?? "El identity pack no tiene una identidad consistente para generar",
        422,
      );
    }

    return profile;
  }
}
