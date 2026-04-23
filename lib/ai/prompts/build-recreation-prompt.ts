import type { ReferenceAnalysis } from "@/types/domain";

interface RecreationPromptInput {
  analysis: ReferenceAnalysis;
  referenceFidelity: number;
  identityStrength: number;
  variant: "faithful" | "editorial" | "cinematic";
  identityProfileSummary: string;
  rejectedReasons?: string[];
}

const variantDirectives: Record<RecreationPromptInput["variant"], string> = {
  faithful: "Maximum lock on original composition, pose, framing, wardrobe and background.",
  editorial: "Keep the same scene and framing, allow only subtle editorial color and texture refinement.",
  cinematic: "Keep the same scene and framing, allow only subtle cinematic grading without scene drift.",
};

export function buildRecreationPrompt(input: RecreationPromptInput) {
  const { analysis, referenceFidelity, identityStrength, variant, identityProfileSummary, rejectedReasons = [] } = input;

  const retryHints = rejectedReasons.length
    ? `\nPrevious rejected attempts reasons:\n- ${rejectedReasons.join("\n- ")}\nAddress these failures explicitly.`
    : "";

  return `
Use the reference image as the primary composition blueprint.
Preserve original framing, camera angle, body position, clothing structure, held objects, lighting direction, background layout, and scene context as faithfully as possible.
Replace ONLY the subject identity with the identity defined by the provided identity pack images and profile.

Identity profile summary:
${identityProfileSummary}

Generation controls:
- Reference fidelity: ${referenceFidelity}/100
- Identity strength: ${identityStrength}/100
- Variant: ${variant}

Reference scene constraints:
- shotType: ${analysis.shotType}
- cameraAngle: ${analysis.cameraAngle}
- composition: ${analysis.composition}
- poseDescription: ${analysis.poseDescription}
- facialExpression: ${analysis.facialExpression}
- gazeDirection: ${analysis.gazeDirection}
- lighting: ${analysis.lighting}
- environment: ${analysis.environment}
- wardrobe: ${analysis.wardrobe}
- bodyVisibility: ${analysis.bodyVisibility}
- backgroundDescription: ${analysis.backgroundDescription}
- heldObjects: ${analysis.heldObjects.join(", ")}
- importantDoNotChangeElements: ${analysis.importantDoNotChangeElements.join(" | ")}
- compositionLockNotes: ${analysis.compositionLockNotes.join(" | ")}
- styleKeywords: ${analysis.styleKeywords.join(", ")}

Hard rules:
1) Final face must clearly match the identity pack, not a generic person and not the original reference face.
2) Do NOT change gender presentation, ethnicity, age range, or facial structure beyond what identity pack implies.
3) Do NOT transform this scene into a studio portrait.
4) Do NOT simplify or replace background unless impossible.
5) Keep object-in-hand, pose and framing aligned with the reference.
6) If identity cannot be preserved with high confidence, fail rather than inventing a new face.
7) Do NOT mix reference identity with identity-pack identity. Identity must come only from identity-pack images.
8) Do NOT recenter, crop, or reframe unless strictly required by model limitations.
9) Do NOT remove or replace wardrobe/objects unless impossible; keep visually equivalent structure.
10) Do NOT output a generic stock model, beauty portrait, or clean corporate headshot when reference is contextual.
11) ${variantDirectives[variant]}
${retryHints}
`;
}
