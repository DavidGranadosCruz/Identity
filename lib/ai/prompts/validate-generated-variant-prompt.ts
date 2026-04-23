import type { ReferenceAnalysis } from "@/types/domain";

export function validateGeneratedVariantPrompt(input: {
  referenceAnalysis: ReferenceAnalysis;
  identityProfileSummary: string;
}) {
  const { referenceAnalysis, identityProfileSummary } = input;

  return `
You are validating whether a generated recreation is acceptable.
You receive:
1) generated candidate image
2) original reference image
3) identity pack images

Goal:
- Identity MUST match the identity pack.
- Composition and scene MUST remain close to reference.

Identity profile summary:
${identityProfileSummary}

Reference constraints:
- shotType: ${referenceAnalysis.shotType}
- cameraAngle: ${referenceAnalysis.cameraAngle}
- composition: ${referenceAnalysis.composition}
- poseDescription: ${referenceAnalysis.poseDescription}
- wardrobe: ${referenceAnalysis.wardrobe}
- backgroundDescription: ${referenceAnalysis.backgroundDescription}
- heldObjects: ${referenceAnalysis.heldObjects.join(", ")}
- importantDoNotChangeElements: ${referenceAnalysis.importantDoNotChangeElements.join(" | ")}

Return ONLY valid JSON with these keys:
- identitySimilarityScore (0-100)
- referenceCompositionScore (0-100)
- backgroundPreservationScore (0-100)
- poseMatchScore (0-100)
- overallAcceptanceScore (0-100)
- accepted (boolean)
- rejectionReason (string|null)

Scoring policy:
- If identity mismatch is visible, identitySimilarityScore must be low (<60) and accepted=false.
- If scene drift is significant, reduce composition/background/pose scores.
- accepted=true only when identity and composition are both strong.
`;
}
