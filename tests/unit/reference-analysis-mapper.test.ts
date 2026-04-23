import { describe, expect, it } from "vitest";
import { mapReferenceAnalysis } from "@/lib/ai/mappers/reference-analysis-mapper";

describe("mapReferenceAnalysis", () => {
  it("parses JSON text into ReferenceAnalysis", () => {
    const result = mapReferenceAnalysis(`{
      "shotType": "portrait",
      "cameraAngle": "eye-level",
      "composition": "center",
      "poseDescription": "standing",
      "facialExpression": "neutral",
      "gazeDirection": "to camera",
      "lighting": "soft",
      "environment": "studio",
      "wardrobe": "jacket",
      "colorPalette": ["black"],
      "mood": "minimal",
      "realismLevel": "high",
      "importantDoNotChangeElements": ["frame"],
      "backgroundDescription": "blur",
      "bodyVisibility": "half",
      "styleKeywords": ["editorial"],
      "subjectCount": 1,
      "singlePersonClear": true,
      "primaryFaceVisible": true,
      "heldObjects": ["none"],
      "compositionLockNotes": ["keep framing"],
      "referenceQuality": "high"
    }`);

    expect(result.shotType).toBe("portrait");
    expect(result.styleKeywords).toEqual(["editorial"]);
  });
});
