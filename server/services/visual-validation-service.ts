import { decodeImageBuffer, sampleGrayMatrix } from "@/lib/vision/image-decoder";
import { cosineSimilarity, similarityToScore } from "@/lib/utils/image-scoring";
import type { FaceDetectionSummary } from "@/server/services/face-engine-service";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreFromMae(mae: number) {
  return clamp(100 - (mae / 255) * 120);
}

function computeMae(left: Float32Array, right: Float32Array, ignore?: (index: number) => boolean) {
  if (left.length !== right.length || left.length === 0) return 255;

  let sum = 0;
  let count = 0;

  for (let index = 0; index < left.length; index += 1) {
    if (ignore?.(index)) continue;
    sum += Math.abs((left[index] ?? 0) - (right[index] ?? 0));
    count += 1;
  }

  if (!count) return 255;
  return sum / count;
}

function scaledMaskFactory(params: {
  width: number;
  height: number;
  maskWidth: number;
  maskHeight: number;
  box: [number, number, number, number] | null;
  expansion?: number;
}) {
  if (!params.box) {
    return () => false;
  }

  const expansion = params.expansion ?? 1.8;
  const centerX = params.box[0] + params.box[2] / 2;
  const centerY = params.box[1] + params.box[3] / 2;
  const expandedWidth = params.box[2] * expansion;
  const expandedHeight = params.box[3] * expansion;

  const minX = clamp((centerX - expandedWidth / 2) / params.width, 0, 1);
  const maxX = clamp((centerX + expandedWidth / 2) / params.width, 0, 1);
  const minY = clamp((centerY - expandedHeight / 2) / params.height, 0, 1);
  const maxY = clamp((centerY + expandedHeight / 2) / params.height, 0, 1);

  return (index: number) => {
    const x = index % params.maskWidth;
    const y = Math.floor(index / params.maskWidth);

    const ratioX = x / params.maskWidth;
    const ratioY = y / params.maskHeight;

    return ratioX >= minX && ratioX <= maxX && ratioY >= minY && ratioY <= maxY;
  };
}

function computePoseMatchScore(params: {
  referenceFace: FaceDetectionSummary;
  generatedFace: FaceDetectionSummary;
  referenceWidth: number;
  referenceHeight: number;
  generatedWidth: number;
  generatedHeight: number;
}) {
  if (!params.referenceFace.faceVisible || !params.generatedFace.faceVisible) {
    return 0;
  }

  const yawDiff = Math.abs(params.referenceFace.yaw - params.generatedFace.yaw);
  const pitchDiff = Math.abs(params.referenceFace.pitch - params.generatedFace.pitch);
  const rollDiff = Math.abs(params.referenceFace.roll - params.generatedFace.roll);

  const refBox = params.referenceFace.boundingBox;
  const genBox = params.generatedFace.boundingBox;

  if (!refBox || !genBox) {
    return 0;
  }

  const refCenterX = (refBox[0] + refBox[2] / 2) / Math.max(1, params.referenceWidth);
  const refCenterY = (refBox[1] + refBox[3] / 2) / Math.max(1, params.referenceHeight);
  const genCenterX = (genBox[0] + genBox[2] / 2) / Math.max(1, params.generatedWidth);
  const genCenterY = (genBox[1] + genBox[3] / 2) / Math.max(1, params.generatedHeight);

  const centerDiff = Math.sqrt((refCenterX - genCenterX) ** 2 + (refCenterY - genCenterY) ** 2);

  const refArea = Math.max(1, refBox[2] * refBox[3]);
  const genArea = Math.max(1, genBox[2] * genBox[3]);
  const areaRatioDiff = Math.abs(refArea - genArea) / Math.max(refArea, genArea);

  return Math.round(
    clamp(
      100 -
        yawDiff * 135 -
        pitchDiff * 95 -
        rollDiff * 110 -
        centerDiff * 170 -
        areaRatioDiff * 95,
    ),
  );
}

function identitySimilarityScore(generatedEmbedding: number[], centroid: number[]) {
  if (!generatedEmbedding.length || !centroid.length || generatedEmbedding.length !== centroid.length) {
    return 0;
  }

  return similarityToScore(cosineSimilarity(generatedEmbedding, centroid));
}

export interface VariantValidationOutcome {
  identitySimilarityScore: number;
  referenceCompositionScore: number;
  backgroundPreservationScore: number;
  poseMatchScore: number;
  overallAcceptanceScore: number;
  accepted: boolean;
  rejectionReason: string | null;
  diagnostics: Record<string, unknown>;
}

export class VisualValidationService {
  async validateVariant(params: {
    referenceBuffer: Buffer;
    referenceMimeType: string;
    generatedBuffer: Buffer;
    generatedMimeType: string;
    profileCentroid: number[];
    referenceFace: FaceDetectionSummary;
    generatedFace: FaceDetectionSummary;
    thresholds: {
      identity: number;
      composition: number;
      background: number;
      pose: number;
      overall: number;
    };
  }): Promise<VariantValidationOutcome> {
    const [referenceDecoded, generatedDecoded] = await Promise.all([
      decodeImageBuffer({ buffer: params.referenceBuffer, mimeType: params.referenceMimeType }),
      decodeImageBuffer({ buffer: params.generatedBuffer, mimeType: params.generatedMimeType }),
    ]);

    const referenceSample = sampleGrayMatrix({
      gray: referenceDecoded.gray,
      width: referenceDecoded.width,
      height: referenceDecoded.height,
      targetWidth: 256,
      targetHeight: 256,
    });

    const generatedSample = sampleGrayMatrix({
      gray: generatedDecoded.gray,
      width: generatedDecoded.width,
      height: generatedDecoded.height,
      targetWidth: 256,
      targetHeight: 256,
    });

    const compositionMae = computeMae(referenceSample, generatedSample);
    const referenceCompositionScore = Math.round(scoreFromMae(compositionMae));

    const referenceMask = scaledMaskFactory({
      width: referenceDecoded.width,
      height: referenceDecoded.height,
      maskWidth: 256,
      maskHeight: 256,
      box: params.referenceFace.boundingBox,
      expansion: 2,
    });

    const generatedMask = scaledMaskFactory({
      width: generatedDecoded.width,
      height: generatedDecoded.height,
      maskWidth: 256,
      maskHeight: 256,
      box: params.generatedFace.boundingBox,
      expansion: 2,
    });

    const backgroundMae = computeMae(referenceSample, generatedSample, (index) => referenceMask(index) || generatedMask(index));
    const backgroundPreservationScore = Math.round(scoreFromMae(backgroundMae));

    const poseMatchScore = computePoseMatchScore({
      referenceFace: params.referenceFace,
      generatedFace: params.generatedFace,
      referenceWidth: referenceDecoded.width,
      referenceHeight: referenceDecoded.height,
      generatedWidth: generatedDecoded.width,
      generatedHeight: generatedDecoded.height,
    });

    const identitySimilarity = identitySimilarityScore(params.generatedFace.identityEmbedding, params.profileCentroid);

    const overallAcceptanceScore = Math.round(
      identitySimilarity * 0.45 +
        referenceCompositionScore * 0.2 +
        backgroundPreservationScore * 0.2 +
        poseMatchScore * 0.15,
    );

    const failedReasons: string[] = [];

    if (!params.generatedFace.faceVisible) {
      failedReasons.push("No se detecta rostro en la imagen generada");
    }
    if (identitySimilarity < params.thresholds.identity) {
      failedReasons.push(`identidad baja (${identitySimilarity})`);
    }
    if (referenceCompositionScore < params.thresholds.composition) {
      failedReasons.push(`composicion desviada (${referenceCompositionScore})`);
    }
    if (backgroundPreservationScore < params.thresholds.background) {
      failedReasons.push(`fondo alterado (${backgroundPreservationScore})`);
    }
    if (poseMatchScore < params.thresholds.pose) {
      failedReasons.push(`pose no coincide (${poseMatchScore})`);
    }
    if (overallAcceptanceScore < params.thresholds.overall) {
      failedReasons.push(`overall bajo (${overallAcceptanceScore})`);
    }

    const accepted = failedReasons.length === 0;

    return {
      identitySimilarityScore: identitySimilarity,
      referenceCompositionScore,
      backgroundPreservationScore,
      poseMatchScore,
      overallAcceptanceScore,
      accepted,
      rejectionReason: accepted ? null : failedReasons.join("; "),
      diagnostics: {
        compositionMae: Number(compositionMae.toFixed(2)),
        backgroundMae: Number(backgroundMae.toFixed(2)),
        referenceFaceCount: params.referenceFace.faceCount,
        generatedFaceCount: params.generatedFace.faceCount,
        referenceYaw: params.referenceFace.yaw,
        generatedYaw: params.generatedFace.yaw,
      },
    };
  }
}
