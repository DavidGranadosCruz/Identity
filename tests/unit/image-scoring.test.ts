import { describe, expect, it } from "vitest";
import { analyzeIdentityImageHeuristics, buildIdentityImageScore } from "@/lib/utils/image-scoring";

describe("identity image scoring", () => {
  it("builds a keep recommendation for strong inputs", () => {
    const heuristics = analyzeIdentityImageHeuristics({
      fileSize: 2_200_000,
      width: 1600,
      height: 2200,
    });

    const score = buildIdentityImageScore({
      heuristics,
      multimodal: {
        faceVisible: true,
        facePartiallyCovered: false,
        faceCount: 1,
        multiplePeople: false,
        extremeProfile: false,
        blurLevel: "low",
        watermarkDetected: false,
        cutoutOrRenderDetected: false,
        poseType: "frontal",
        lighting: "good",
        perceivedSharpness: "excellent",
        recreationSuitability: "high",
        identityDescriptor: "frontal male face, neutral expression",
        identityEmbedding: Array.from({ length: 32 }).map(() => 0.2),
        recommendationReason: "Good candidate",
      },
      identityConsistencyScore: 88,
    });

    expect(score.finalScore).toBeGreaterThanOrEqual(72);
    expect(score.recommendation).toBe("keep");
  });

  it("builds a replace recommendation for weak inputs", () => {
    const heuristics = analyzeIdentityImageHeuristics({
      fileSize: 200_000,
      width: 640,
      height: 640,
    });

    const score = buildIdentityImageScore({
      heuristics,
      multimodal: {
        faceVisible: false,
        facePartiallyCovered: true,
        faceCount: 2,
        multiplePeople: true,
        extremeProfile: true,
        blurLevel: "high",
        watermarkDetected: true,
        cutoutOrRenderDetected: true,
        poseType: "unknown",
        lighting: "poor",
        perceivedSharpness: "poor",
        recreationSuitability: "low",
        identityDescriptor: "unclear face",
        identityEmbedding: Array.from({ length: 32 }).map(() => 0),
        recommendationReason: "Weak candidate",
      },
      identityConsistencyScore: 35,
    });

    expect(score.recommendation).toBe("replace");
    expect(score.reasons.length).toBeGreaterThan(0);
  });
});
