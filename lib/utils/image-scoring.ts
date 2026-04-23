import type { IdentityImageHeuristicAnalysis, IdentityImageMultimodalAnalysis, KeepRecommendation } from "@/types/domain";

interface HeuristicInput {
  width: number;
  height: number;
  fileSize: number;
}

const IDEAL_RATIO = 3 / 4;
const IDEAL_SIZE_BYTES = 2.5 * 1024 * 1024;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function scoreFromLabel(label: "poor" | "fair" | "good" | "excellent") {
  if (label === "excellent") return 100;
  if (label === "good") return 82;
  if (label === "fair") return 62;
  return 38;
}

function suitabilityScore(label: "low" | "medium" | "high") {
  if (label === "high") return 90;
  if (label === "medium") return 65;
  return 35;
}

function blurScore(label: "low" | "medium" | "high") {
  if (label === "low") return 100;
  if (label === "medium") return 70;
  return 35;
}

export function analyzeIdentityImageHeuristics(input: HeuristicInput): IdentityImageHeuristicAnalysis {
  const safeWidth = Math.max(1, input.width);
  const safeHeight = Math.max(1, input.height);

  const ratio = safeWidth / safeHeight;
  const ratioScore = clamp(100 - Math.abs(ratio - IDEAL_RATIO) * 120);

  const minDimension = Math.min(safeWidth, safeHeight);
  const dimensionsScore = clamp((minDimension / 1200) * 100);

  const resolution = safeWidth * safeHeight;
  const resolutionScore = clamp((resolution / (2200 * 2200)) * 100);

  const sizeDelta = Math.abs(input.fileSize - IDEAL_SIZE_BYTES) / IDEAL_SIZE_BYTES;
  const fileWeightScore = clamp(100 - sizeDelta * 80);

  return {
    resolutionScore: Math.round(resolutionScore),
    dimensionsScore: Math.round(dimensionsScore),
    ratioScore: Math.round(ratioScore),
    fileWeightScore: Math.round(fileWeightScore),
    orientation: safeHeight > safeWidth ? "portrait" : safeHeight < safeWidth ? "landscape" : "square",
    ratio: Number(ratio.toFixed(3)),
    minDimensionsPassed: minDimension >= 800,
  };
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length !== b.length || a.length === 0) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] ** 2;
    normB += b[index] ** 2;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function similarityToScore(similarity: number) {
  return Math.round(clamp(((similarity + 1) / 2) * 100));
}

export function centroid(vectors: number[][]) {
  if (!vectors.length) return [];
  const length = vectors[0].length;
  const sums = Array.from({ length }, () => 0);

  for (const vector of vectors) {
    for (let index = 0; index < length; index += 1) {
      sums[index] += vector[index] ?? 0;
    }
  }

  return sums.map((value) => Number((value / vectors.length).toFixed(6)));
}

export function buildIdentityImageScore(input: {
  heuristics: IdentityImageHeuristicAnalysis;
  multimodal: IdentityImageMultimodalAnalysis;
  identityConsistencyScore: number;
}) {
  const heuristicScore = Math.round(
    input.heuristics.resolutionScore * 0.28 +
      input.heuristics.dimensionsScore * 0.24 +
      input.heuristics.ratioScore * 0.2 +
      input.heuristics.fileWeightScore * 0.28,
  );

  const multimodalScore = Math.round(
    (input.multimodal.faceVisible ? 100 : 25) * 0.16 +
      (input.multimodal.facePartiallyCovered ? 40 : 100) * 0.08 +
      (input.multimodal.multiplePeople ? 20 : 100) * 0.12 +
      (input.multimodal.faceCount === 1 ? 100 : 25) * 0.12 +
      (input.multimodal.extremeProfile ? 45 : 100) * 0.08 +
      blurScore(input.multimodal.blurLevel) * 0.11 +
      (input.multimodal.watermarkDetected ? 35 : 100) * 0.08 +
      (input.multimodal.cutoutOrRenderDetected ? 30 : 100) * 0.1 +
      scoreFromLabel(input.multimodal.lighting) * 0.07 +
      scoreFromLabel(input.multimodal.perceivedSharpness) * 0.04 +
      suitabilityScore(input.multimodal.recreationSuitability) * 0.04,
  );

  const consistencyScore = Math.round(clamp(input.identityConsistencyScore));
  const finalScore = Math.round(heuristicScore * 0.28 + multimodalScore * 0.47 + consistencyScore * 0.25);

  const reasons: string[] = [];
  if (!input.multimodal.faceVisible) reasons.push("Rostro no claramente visible");
  if (input.multimodal.multiplePeople || input.multimodal.faceCount !== 1) reasons.push("No hay una sola cara util");
  if (input.multimodal.facePartiallyCovered) reasons.push("Rostro parcialmente cubierto");
  if (input.multimodal.blurLevel === "high") reasons.push("Imagen con blur alto");
  if (input.multimodal.cutoutOrRenderDetected) reasons.push("Imagen parece recorte/render no fotografico");
  if (input.multimodal.watermarkDetected) reasons.push("Imagen con marca de agua");
  if (input.multimodal.extremeProfile) reasons.push("Perfil extremo con poca informacion facial");
  if (!input.heuristics.minDimensionsPassed) reasons.push("Dimensiones por debajo del minimo recomendado");
  if (consistencyScore < 65) reasons.push("Baja consistencia con la identidad principal");
  if (!reasons.length) reasons.push(input.multimodal.recommendationReason);

  const recommendation: KeepRecommendation = finalScore >= 72 ? "keep" : "replace";

  return {
    heuristicScore,
    multimodalScore,
    consistencyScore,
    finalScore,
    recommendation,
    reasons,
  };
}