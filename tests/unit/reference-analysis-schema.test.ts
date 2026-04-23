import { describe, expect, it } from "vitest";
import { referenceAnalysisSchema } from "@/lib/ai/schemas/reference-analysis-schema";

describe("referenceAnalysisSchema", () => {
  it("accepts strict valid payload", () => {
    const payload = {
      shotType: "medium portrait",
      cameraAngle: "eye-level",
      composition: "center framed",
      poseDescription: "standing",
      facialExpression: "neutral",
      gazeDirection: "to camera",
      lighting: "soft side light",
      environment: "studio",
      wardrobe: "jacket",
      colorPalette: ["black", "blue"],
      mood: "minimal",
      realismLevel: "high",
      importantDoNotChangeElements: ["framing"],
      backgroundDescription: "blurred interior",
      bodyVisibility: "half body",
      styleKeywords: ["editorial"],
      subjectCount: 1,
      singlePersonClear: true,
      primaryFaceVisible: true,
      heldObjects: ["none"],
      compositionLockNotes: ["keep same framing"],
      referenceQuality: "high",
    };

    expect(referenceAnalysisSchema.parse(payload)).toEqual(payload);
  });

  it("rejects missing fields", () => {
    expect(() => referenceAnalysisSchema.parse({})).toThrow();
  });
});
