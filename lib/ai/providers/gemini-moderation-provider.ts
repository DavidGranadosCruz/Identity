import { createPartFromBase64, createPartFromText } from "@google/genai";
import { safetyModerationPrompt } from "@/lib/ai/prompts/safety-moderation-prompt";
import { getGeminiClient, getGeminiModelNames } from "@/lib/ai/providers/gemini-client";
import { parseJsonFromText } from "@/lib/utils/json";
import { AppError } from "@/lib/utils/errors";
import type { AIModerationProvider } from "@/lib/ai/providers/types";

function readResponseText(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const maybe = response as { text?: string | (() => string) };

  if (typeof maybe.text === "function") return maybe.text();
  if (typeof maybe.text === "string") return maybe.text;
  return "";
}

export class GeminiModerationProvider implements AIModerationProvider {
  async moderate(input: {
    prompt: string;
    referenceImageBase64: string;
    referenceMimeType: string;
  }) {
    const client = getGeminiClient();
    const models = getGeminiModelNames();

    const response = await client.models.generateContent({
      model: models.text,
      contents: [
        createPartFromText(safetyModerationPrompt()),
        createPartFromText(`Prompt: ${input.prompt}`),
        createPartFromBase64(input.referenceImageBase64, input.referenceMimeType),
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          required: ["approved", "reason", "blockedCategories"],
          properties: {
            approved: { type: "boolean" },
            reason: { type: "string" },
            blockedCategories: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
      },
    });

    const text = readResponseText(response);
    if (!text) {
      throw new AppError("EMPTY_MODERATION_RESPONSE", "Gemini devolvió moderación vacía", 502);
    }

    const parsed = parseJsonFromText<unknown>(text) as {
      approved?: boolean;
      reason?: string;
      blockedCategories?: string[];
    };

    if (typeof parsed.approved !== "boolean") {
      throw new AppError("INVALID_MODERATION_RESPONSE", "La moderación de Gemini es inválida", 502, parsed);
    }

    return {
      approved: parsed.approved,
      reason: parsed.reason ?? "Sin razón provista",
      blockedCategories: Array.isArray(parsed.blockedCategories) ? parsed.blockedCategories : [],
      raw: response,
    };
  }
}

