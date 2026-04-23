import { describe, expect, it } from "vitest";
import { buildRecreationPrompt } from "@/lib/ai/prompts/build-recreation-prompt";
import type { ReferenceAnalysis } from "@/types/domain";

const baseAnalysis: ReferenceAnalysis = {
  shotType: "portrait",
  cameraAngle: "eye-level",
  composition: "center",
  poseDescription: "standing",
  facialExpression: "soft smile",
  gazeDirection: "camera",
  lighting: "soft",
  environment: "studio",
  wardrobe: "blazer",
  colorPalette: ["black", "gray"],
  mood: "editorial",
  realismLevel: "high",
  importantDoNotChangeElements: ["framing"],
  backgroundDescription: "blur",
  bodyVisibility: "half body",
  styleKeywords: ["minimal"],
  subjectCount: 1,
  singlePersonClear: true,
  primaryFaceVisible: true,
  heldObjects: ["trophy"],
  compositionLockNotes: ["keep player and trophy position"],
  referenceQuality: "high",
};

describe("buildRecreationPrompt", () => {
  it("includes critical identity preservation constraints", () => {
    const prompt = buildRecreationPrompt({
      analysis: baseAnalysis,
      referenceFidelity: 80,
      identityStrength: 90,
      variant: "cinematic",
      identityProfileSummary: "identity profile summary",
    });

    expect(prompt).toContain("Replace ONLY the subject identity");
    expect(prompt).toContain("Reference fidelity: 80/100");
    expect(prompt).toContain("Identity strength: 90/100");
  });
});
