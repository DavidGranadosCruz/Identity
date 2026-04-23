import { createPartFromText } from "@google/genai";
import { selectBestIdentityImagesPrompt } from "@/lib/ai/prompts/select-best-identity-images-prompt";
import { getGeminiClient, getGeminiModelNames } from "@/lib/ai/providers/gemini-client";
import { identityImageSelectionSchema } from "@/lib/ai/schemas/identity-selection-schema";
import { parseJsonFromText } from "@/lib/utils/json";
import { AppError } from "@/lib/utils/errors";
import type { AIIdentityImageSelector } from "@/lib/ai/providers/types";
import type { ReferenceAnalysis } from "@/types/domain";

function readResponseText(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const maybe = response as { text?: string | (() => string) };

  if (typeof maybe.text === "function") return maybe.text();
  if (typeof maybe.text === "string") return maybe.text;
  return "";
}

function summarizeReference(reference: ReferenceAnalysis) {
  return [
    reference.shotType,
    reference.cameraAngle,
    reference.poseDescription,
    reference.lighting,
    reference.mood,
    reference.backgroundDescription,
  ]
    .filter(Boolean)
    .join(" | ");
}

export class GeminiIdentityImageSelector implements AIIdentityImageSelector {
  async selectBestImages(input: {
    referenceAnalysis: ReferenceAnalysis;
    candidates: Array<{
      id: string;
      score: number;
      identityConsistencyScore: number;
      isIdentityValid: boolean;
      tags: string[];
      warnings: string[];
    }>;
  }) {
    const client = getGeminiClient();
    const models = getGeminiModelNames();

    const response = await client.models.generateContent({
      model: models.text,
      contents: createPartFromText(
        selectBestIdentityImagesPrompt(summarizeReference(input.referenceAnalysis), input.candidates),
      ),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          required: ["selectedImageIds", "rationale", "rejectedImageReasons"],
          properties: {
            selectedImageIds: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 12 },
            rationale: { type: "string" },
            rejectedImageReasons: {
              type: "array",
              items: {
                type: "object",
                required: ["imageId", "reason"],
                properties: {
                  imageId: { type: "string" },
                  reason: { type: "string" },
                },
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
      },
    });

    const text = readResponseText(response);
    if (!text) {
      throw new AppError("EMPTY_IDENTITY_SELECTION", "Gemini devolvio seleccion vacia", 502);
    }

    const parsed = identityImageSelectionSchema.safeParse(parseJsonFromText(text));
    if (!parsed.success) {
      throw new AppError("INVALID_IDENTITY_SELECTION", "Gemini devolvio seleccion invalida", 502, parsed.error.issues);
    }

    return {
      selectedImageIds: parsed.data.selectedImageIds,
      rationale: parsed.data.rationale,
      rejectedImageReasons: parsed.data.rejectedImageReasons,
      raw: response,
    };
  }
}