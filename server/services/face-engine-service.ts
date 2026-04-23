import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { decodeImageBuffer, type DecodedImageData } from "@/lib/vision/image-decoder";

type PoseType = "frontal" | "semi_profile" | "profile" | "unknown";
type BlurLevel = "low" | "medium" | "high";
type QualityLevel = "poor" | "fair" | "good" | "excellent";
type RecreationSuitability = "low" | "medium" | "high";

interface HumanFace {
  score?: number;
  boxScore?: number;
  faceScore?: number;
  box?: [number, number, number, number];
  size?: [number, number] | null;
  mesh?: Array<unknown>;
  embedding?: number[];
  rotation?: {
    angle?: {
      pitch?: number;
      yaw?: number;
      roll?: number;
    };
  };
}

interface HumanRuntime {
  tf: {
    tensor3d(data: Int32Array, shape: [number, number, number], dtype: "int32"): unknown;
    dispose(tensor: unknown): void;
  };
  load(): Promise<void>;
  detect(input: unknown): Promise<{ face: HumanFace[] }>;
}

export interface FaceDetectionSummary {
  faceCount: number;
  faceVisible: boolean;
  multiplePeople: boolean;
  facePartiallyCovered: boolean;
  extremeProfile: boolean;
  poseType: PoseType;
  blurLevel: BlurLevel;
  lighting: QualityLevel;
  perceivedSharpness: QualityLevel;
  recreationSuitability: RecreationSuitability;
  watermarkDetected: boolean;
  cutoutOrRenderDetected: boolean;
  identityDescriptor: string;
  identityEmbedding: number[];
  recommendationReason: string;
  qualityScore: number;
  blurScore: number;
  brightnessScore: number;
  faceCoverageRatio: number;
  yaw: number;
  pitch: number;
  roll: number;
  boundingBox: [number, number, number, number] | null;
}

const HUMAN_MODULE_PATH = path.join(process.cwd(), "node_modules", "@vladmandic", "human", "dist", "human.node-wasm.js");
const MODEL_BASE_PATH = `file://${process.cwd().replace(/\\/g, "/")}/node_modules/@vladmandic/human/models/`;
const WASM_PATH = `file://${process.cwd().replace(/\\/g, "/")}/node_modules/@tensorflow/tfjs-backend-wasm/dist/`;

let humanInstancePromise: Promise<HumanRuntime> | null = null;
let fileFetchPatched = false;

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalize(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) return vector.map(() => 0);
  return vector.map((value) => value / norm);
}

function compressEmbedding(input: number[], targetDimensions = 128) {
  if (!input.length) return [];

  if (input.length <= targetDimensions) {
    return normalize(input.map((value) => Number(value.toFixed(6))));
  }

  const compressed: number[] = [];
  const chunkSize = input.length / targetDimensions;

  for (let index = 0; index < targetDimensions; index += 1) {
    const start = Math.floor(index * chunkSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * chunkSize));
    let sum = 0;

    for (let position = start; position < end; position += 1) {
      sum += input[position] ?? 0;
    }

    compressed.push(sum / (end - start));
  }

  return normalize(compressed.map((value) => Number(value.toFixed(6))));
}

function installFileFetchPatch() {
  if (fileFetchPatched) return;
  fileFetchPatched = true;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (url.startsWith("file://")) {
      const filePath = fileURLToPath(url);
      const body = await fs.readFile(filePath);
      return new Response(body, { status: 200 });
    }

    return originalFetch(input as RequestInfo, init);
  };
}

function estimateBlurScore(gray: Float32Array, width: number, height: number) {
  const stride = Math.max(1, Math.floor(Math.max(width, height) / 512));

  let sumGradient = 0;
  let samples = 0;

  for (let y = stride; y < height - stride; y += stride) {
    for (let x = stride; x < width - stride; x += stride) {
      const index = y * width + x;
      const gx = Math.abs((gray[index + stride] ?? 0) - (gray[index - stride] ?? 0));
      const gy = Math.abs((gray[index + width * stride] ?? 0) - (gray[index - width * stride] ?? 0));
      sumGradient += gx + gy;
      samples += 1;
    }
  }

  if (!samples) return 0;

  const meanGradient = sumGradient / samples;
  return clamp((meanGradient / 36) * 100);
}

function estimateBrightness(gray: Float32Array) {
  if (!gray.length) return 0;
  const sum = gray.reduce((accumulator, value) => accumulator + value, 0);
  return clamp((sum / gray.length / 255) * 100);
}

function qualityFromScore(score: number): QualityLevel {
  if (score >= 84) return "excellent";
  if (score >= 66) return "good";
  if (score >= 45) return "fair";
  return "poor";
}

function blurLevelFromScore(score: number): BlurLevel {
  if (score >= 72) return "low";
  if (score >= 48) return "medium";
  return "high";
}

function poseTypeFromYaw(yaw: number): PoseType {
  const absoluteYaw = Math.abs(yaw);
  if (absoluteYaw <= 0.18) return "frontal";
  if (absoluteYaw <= 0.46) return "semi_profile";
  return "profile";
}

function detectCornerWatermark(decoded: DecodedImageData) {
  const { rgba, width, height } = decoded;
  if (!width || !height) return false;

  const patchWidth = Math.max(24, Math.floor(width * 0.14));
  const patchHeight = Math.max(24, Math.floor(height * 0.14));

  const patches = [
    { x: 0, y: 0 },
    { x: width - patchWidth, y: 0 },
    { x: 0, y: height - patchHeight },
    { x: width - patchWidth, y: height - patchHeight },
  ];

  for (const patch of patches) {
    let brightGray = 0;
    let edgeLike = 0;
    let total = 0;

    for (let y = patch.y + 1; y < patch.y + patchHeight - 1; y += 1) {
      for (let x = patch.x + 1; x < patch.x + patchWidth - 1; x += 1) {
        const index = (y * width + x) * 4;
        const red = rgba[index] ?? 0;
        const green = rgba[index + 1] ?? 0;
        const blue = rgba[index + 2] ?? 0;

        const maxChannel = Math.max(red, green, blue);
        const minChannel = Math.min(red, green, blue);
        const luminance = red * 0.299 + green * 0.587 + blue * 0.114;

        if (luminance > 180 && maxChannel - minChannel < 24) {
          brightGray += 1;
        }

        const rightIndex = index + 4;
        const downIndex = index + width * 4;
        const gx = Math.abs((rgba[rightIndex] ?? red) - red);
        const gy = Math.abs((rgba[downIndex] ?? red) - red);

        if (gx + gy > 36) {
          edgeLike += 1;
        }

        total += 1;
      }
    }

    if (!total) continue;

    const brightGrayRatio = brightGray / total;
    const edgeRatio = edgeLike / total;

    if (brightGrayRatio > 0.05 && brightGrayRatio < 0.32 && edgeRatio > 0.16) {
      return true;
    }
  }

  return false;
}

function faceCoverageScore(ratio: number) {
  if (ratio <= 0.015) return 18;
  if (ratio <= 0.04) return 48;
  if (ratio <= 0.42) return 100;
  if (ratio <= 0.58) return 82;
  return 66;
}

function toIdentityDescriptor(input: {
  poseType: PoseType;
  lighting: QualityLevel;
  perceivedSharpness: QualityLevel;
  faceCoverageRatio: number;
  multiplePeople: boolean;
}) {
  const coveragePercent = Math.round(input.faceCoverageRatio * 100);
  const peopleLabel = input.multiplePeople ? "multiple_people" : "single_subject";

  return `${peopleLabel}; pose=${input.poseType}; lighting=${input.lighting}; sharpness=${input.perceivedSharpness}; face_coverage=${coveragePercent}%`;
}

function toRecommendationReason(input: {
  faceVisible: boolean;
  multiplePeople: boolean;
  facePartiallyCovered: boolean;
  extremeProfile: boolean;
  blurLevel: BlurLevel;
  cutoutOrRenderDetected: boolean;
  watermarkDetected: boolean;
}) {
  if (!input.faceVisible) return "No se detecta rostro util en la imagen";
  if (input.multiplePeople) return "Hay varias personas; se necesita una sola identidad clara";
  if (input.cutoutOrRenderDetected) return "La imagen parece recorte/render y no una foto util de identidad";
  if (input.facePartiallyCovered) return "Rostro parcialmente cubierto";
  if (input.extremeProfile) return "Perfil demasiado extremo para preservar identidad";
  if (input.blurLevel === "high") return "Imagen con blur alto";
  if (input.watermarkDetected) return "Se detecta posible marca de agua";
  return "Imagen apta para identidad y recreacion";
}

async function getHumanRuntime() {
  if (humanInstancePromise) return humanInstancePromise;

  humanInstancePromise = (async () => {
    installFileFetchPatch();
    const humanModuleUrl = pathToFileURL(HUMAN_MODULE_PATH).href;
    const loaded = (await import(humanModuleUrl)) as { Human: new (config: Record<string, unknown>) => HumanRuntime };

    const human = new loaded.Human({
      backend: "wasm",
      debug: false,
      warmup: "none",
      modelBasePath: MODEL_BASE_PATH,
      wasmPath: WASM_PATH,
      face: {
        enabled: true,
        detector: { enabled: true },
        mesh: { enabled: true },
        iris: { enabled: false },
        description: { enabled: true },
        emotion: { enabled: false },
        antispoof: { enabled: false },
        liveness: { enabled: false },
      },
      body: { enabled: false },
      hand: { enabled: false },
      object: { enabled: false },
      segmentation: { enabled: false },
      gesture: { enabled: false },
    });

    await human.load();
    return human;
  })();

  return humanInstancePromise;
}

export class FaceEngineService {
  async analyzeIdentityImage(params: { buffer: Buffer; mimeType: string }): Promise<FaceDetectionSummary> {
    const decoded = await decodeImageBuffer({ buffer: params.buffer, mimeType: params.mimeType });
    const human = await getHumanRuntime();

    const tensor = human.tf.tensor3d(decoded.rgb, [decoded.height, decoded.width, 3], "int32");

    let detection: { face: HumanFace[] };

    try {
      detection = await human.detect(tensor);
    } finally {
      human.tf.dispose(tensor);
    }

    const faces = [...(detection.face ?? [])].sort((left, right) => {
      const leftScore = (left.score ?? 0) * 0.4 + (left.faceScore ?? 0) * 0.4 + (left.boxScore ?? 0) * 0.2;
      const rightScore = (right.score ?? 0) * 0.4 + (right.faceScore ?? 0) * 0.4 + (right.boxScore ?? 0) * 0.2;
      return rightScore - leftScore;
    });

    const primaryFace = faces[0] ?? null;
    const faceCount = faces.length;
    const faceVisible = faceCount > 0;
    const multiplePeople = faceCount > 1;

    const yaw = primaryFace?.rotation?.angle?.yaw ?? 0;
    const pitch = primaryFace?.rotation?.angle?.pitch ?? 0;
    const roll = primaryFace?.rotation?.angle?.roll ?? 0;

    const poseType = faceVisible ? poseTypeFromYaw(yaw) : "unknown";
    const extremeProfile = Math.abs(yaw) >= 0.55;

    const blurScore = estimateBlurScore(decoded.gray, decoded.width, decoded.height);
    const brightnessScore = estimateBrightness(decoded.gray);

    const blurLevel = blurLevelFromScore(blurScore);
    const lighting = qualityFromScore(brightnessScore);
    const perceivedSharpness = qualityFromScore(blurScore);

    const boundingBox = primaryFace?.box ?? null;
    const faceArea = boundingBox ? Math.max(0, boundingBox[2]) * Math.max(0, boundingBox[3]) : 0;
    const imageArea = Math.max(1, decoded.width * decoded.height);
    const faceCoverageRatio = faceArea / imageArea;

    const detectionConfidence =
      primaryFace && faceVisible
        ? clamp(((primaryFace.score ?? 0) * 0.4 + (primaryFace.faceScore ?? 0) * 0.35 + (primaryFace.boxScore ?? 0) * 0.25) * 100)
        : 0;

    const meshCount = primaryFace?.mesh?.length ?? 0;
    const facePartiallyCovered =
      faceVisible &&
      (meshCount < 340 || detectionConfidence < 72 || (primaryFace?.faceScore ?? 0) < 0.78 || (primaryFace?.boxScore ?? 0) < 0.76);

    const cutoutByAlpha = decoded.alphaRatio > 0.08;
    const cutoutByCoverage = faceCoverageRatio < 0.015;
    const cutoutOrRenderDetected = cutoutByAlpha || cutoutByCoverage;

    const watermarkDetected = detectCornerWatermark(decoded);

    const qualityScore = clamp(
      detectionConfidence * 0.42 +
        blurScore * 0.24 +
        faceCoverageScore(faceCoverageRatio) * 0.18 +
        (facePartiallyCovered ? 45 : 100) * 0.08 +
        (extremeProfile ? 52 : 100) * 0.05 +
        (multiplePeople ? 25 : 100) * 0.03,
    );

    const recreationSuitability: RecreationSuitability = qualityScore >= 72 ? "high" : qualityScore >= 52 ? "medium" : "low";

    const rawEmbedding = primaryFace?.embedding ?? [];
    const identityEmbedding = compressEmbedding(rawEmbedding, 128);

    const identityDescriptor = toIdentityDescriptor({
      poseType,
      lighting,
      perceivedSharpness,
      faceCoverageRatio,
      multiplePeople,
    });

    const recommendationReason = toRecommendationReason({
      faceVisible,
      multiplePeople,
      facePartiallyCovered,
      extremeProfile,
      blurLevel,
      cutoutOrRenderDetected,
      watermarkDetected,
    });

    return {
      faceCount,
      faceVisible,
      multiplePeople,
      facePartiallyCovered,
      extremeProfile,
      poseType,
      blurLevel,
      lighting,
      perceivedSharpness,
      recreationSuitability,
      watermarkDetected,
      cutoutOrRenderDetected,
      identityDescriptor,
      identityEmbedding,
      recommendationReason,
      qualityScore: Math.round(qualityScore),
      blurScore: Math.round(blurScore),
      brightnessScore: Math.round(brightnessScore),
      faceCoverageRatio: Number(faceCoverageRatio.toFixed(4)),
      yaw: Number(yaw.toFixed(4)),
      pitch: Number(pitch.toFixed(4)),
      roll: Number(roll.toFixed(4)),
      boundingBox,
    };
  }

  async analyzeReferenceImage(params: { buffer: Buffer; mimeType: string }) {
    const base = await this.analyzeIdentityImage(params);

    const referenceQuality: "low" | "medium" | "high" =
      base.qualityScore >= 76 ? "high" : base.qualityScore >= 52 ? "medium" : "low";

    const singlePersonClear = base.faceCount === 1 && !base.multiplePeople;
    const primaryFaceVisible = base.faceVisible && !base.facePartiallyCovered;

    return {
      subjectCount: base.faceCount,
      singlePersonClear,
      primaryFaceVisible,
      referenceQuality,
      lockNotes: [
        `pose=${base.poseType}`,
        `yaw=${base.yaw}`,
        `pitch=${base.pitch}`,
        `roll=${base.roll}`,
        `faceCoverage=${Math.round(base.faceCoverageRatio * 100)}%`,
      ],
      diagnostics: {
        qualityScore: base.qualityScore,
        blurScore: base.blurScore,
        brightnessScore: base.brightnessScore,
        multiplePeople: base.multiplePeople,
        facePartiallyCovered: base.facePartiallyCovered,
      },
    };
  }
}
