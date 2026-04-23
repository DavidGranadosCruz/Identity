import { describe, expect, it } from "vitest";
import { Jimp } from "jimp";
import { VisualValidationService } from "@/server/services/visual-validation-service";
import type { FaceDetectionSummary } from "@/server/services/face-engine-service";

const service = new VisualValidationService();

async function solidImageBuffer(color: number) {
  const image = new Jimp({ width: 256, height: 256, color });
  return Buffer.from(await image.getBuffer("image/png"));
}

function faceSummary(overrides: Partial<FaceDetectionSummary> = {}): FaceDetectionSummary {
  return {
    faceCount: 1,
    faceVisible: true,
    multiplePeople: false,
    facePartiallyCovered: false,
    extremeProfile: false,
    poseType: "frontal",
    blurLevel: "low",
    lighting: "good",
    perceivedSharpness: "good",
    recreationSuitability: "high",
    watermarkDetected: false,
    cutoutOrRenderDetected: false,
    identityDescriptor: "single_subject",
    identityEmbedding: Array.from({ length: 128 }).map(() => 0.1),
    recommendationReason: "ok",
    qualityScore: 90,
    blurScore: 85,
    brightnessScore: 70,
    faceCoverageRatio: 0.22,
    yaw: 0,
    pitch: 0,
    roll: 0,
    boundingBox: [70, 40, 120, 150],
    ...overrides,
  };
}

describe("VisualValidationService", () => {
  it("accepts near-identical variant when scores pass thresholds", async () => {
    const reference = await solidImageBuffer(0x808080ff);
    const generated = await solidImageBuffer(0x808080ff);

    const result = await service.validateVariant({
      referenceBuffer: reference,
      referenceMimeType: "image/png",
      generatedBuffer: generated,
      generatedMimeType: "image/png",
      profileCentroid: Array.from({ length: 128 }).map(() => 0.1),
      referenceFace: faceSummary(),
      generatedFace: faceSummary(),
      thresholds: {
        identity: 75,
        composition: 70,
        background: 65,
        pose: 70,
        overall: 74,
      },
    });

    expect(result.accepted).toBe(true);
    expect(result.identitySimilarityScore).toBeGreaterThanOrEqual(95);
    expect(result.referenceCompositionScore).toBeGreaterThanOrEqual(95);
    expect(result.backgroundPreservationScore).toBeGreaterThanOrEqual(95);
    expect(result.poseMatchScore).toBeGreaterThanOrEqual(95);
  });

  it("rejects variant when identity and composition diverge", async () => {
    const reference = await solidImageBuffer(0x303030ff);
    const generated = await solidImageBuffer(0xf0f0f0ff);

    const result = await service.validateVariant({
      referenceBuffer: reference,
      referenceMimeType: "image/png",
      generatedBuffer: generated,
      generatedMimeType: "image/png",
      profileCentroid: Array.from({ length: 128 }).map(() => 0.1),
      referenceFace: faceSummary(),
      generatedFace: faceSummary({
        identityEmbedding: Array.from({ length: 128 }).map(() => -0.1),
        yaw: 0.5,
        boundingBox: [30, 20, 150, 170],
      }),
      thresholds: {
        identity: 75,
        composition: 70,
        background: 65,
        pose: 70,
        overall: 74,
      },
    });

    expect(result.accepted).toBe(false);
    expect(result.identitySimilarityScore).toBeLessThan(60);
    expect(result.referenceCompositionScore).toBeLessThan(70);
    expect(result.rejectionReason).toContain("identidad baja");
  });
});
