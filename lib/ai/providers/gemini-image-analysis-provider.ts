import { createPartFromBase64 } from "@google/genai";
import { mapReferenceAnalysis } from "@/lib/ai/mappers/reference-analysis-mapper";
import { analyzeIdentityImagePrompt } from "@/lib/ai/prompts/analyze-identity-image-prompt";
import { analyzeReferenceImagePrompt } from "@/lib/ai/prompts/analyze-reference-image-prompt";
import { validateGeneratedVariantPrompt } from "@/lib/ai/prompts/validate-generated-variant-prompt";
import { getGeminiClient, getGeminiModelNames } from "@/lib/ai/providers/gemini-client";
import { identityImageMultimodalSchema } from "@/lib/ai/schemas/identity-image-analysis-schema";
import { variantValidationSchema } from "@/lib/ai/schemas/variant-validation-schema";
import { parseJsonFromText } from "@/lib/utils/json";
import { AppError } from "@/lib/utils/errors";
import type { AIImageAnalysisProvider } from "@/lib/ai/providers/types";

function readResponseText(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const maybe = response as { text?: string | (() => string) };

  if (typeof maybe.text === "function") {
    return maybe.text();
  }

  if (typeof maybe.text === "string") {
    return maybe.text;
  }

  return "";
}

export class GeminiImageAnalysisProvider implements AIImageAnalysisProvider {
  async analyzeReferenceImage(input: { imageBase64: string; mimeType: string }) {
    const client = getGeminiClient();
    const models = getGeminiModelNames();

    const response = await client.models.generateContent({
      model: models.text,
      contents: [analyzeReferenceImagePrompt(), createPartFromBase64(input.imageBase64, input.mimeType)],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          required: [
            "shotType",
            "cameraAngle",
            "composition",
            "poseDescription",
            "facialExpression",
            "gazeDirection",
            "lighting",
            "environment",
            "wardrobe",
            "colorPalette",
            "mood",
            "realismLevel",
            "importantDoNotChangeElements",
            "backgroundDescription",
            "bodyVisibility",
            "styleKeywords",
            "subjectCount",
            "singlePersonClear",
            "primaryFaceVisible",
            "heldObjects",
            "compositionLockNotes",
            "referenceQuality",
          ],
          properties: {
            shotType: { type: "string" },
            cameraAngle: { type: "string" },
            composition: { type: "string" },
            poseDescription: { type: "string" },
            facialExpression: { type: "string" },
            gazeDirection: { type: "string" },
            lighting: { type: "string" },
            environment: { type: "string" },
            wardrobe: { type: "string" },
            colorPalette: { type: "array", items: { type: "string" } },
            mood: { type: "string" },
            realismLevel: { type: "string" },
            importantDoNotChangeElements: { type: "array", items: { type: "string" } },
            backgroundDescription: { type: "string" },
            bodyVisibility: { type: "string" },
            styleKeywords: { type: "array", items: { type: "string" } },
            subjectCount: { type: "integer" },
            singlePersonClear: { type: "boolean" },
            primaryFaceVisible: { type: "boolean" },
            heldObjects: { type: "array", items: { type: "string" } },
            compositionLockNotes: { type: "array", items: { type: "string" } },
            referenceQuality: { type: "string", enum: ["low", "medium", "high"] },
          },
          additionalProperties: false,
        },
      },
    });

    const text = readResponseText(response);
    if (!text) {
      throw new AppError("EMPTY_REFERENCE_ANALYSIS", "Gemini devolvio analisis vacio para la referencia", 502);
    }

    return {
      analysis: mapReferenceAnalysis(text),
      raw: response,
    };
  }

  async analyzeIdentityImage(input: { imageBase64: string; mimeType: string }) {
    const client = getGeminiClient();
    const models = getGeminiModelNames();

    const response = await client.models.generateContent({
      model: models.text,
      contents: [analyzeIdentityImagePrompt(), createPartFromBase64(input.imageBase64, input.mimeType)],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          required: [
            "faceVisible",
            "facePartiallyCovered",
            "faceCount",
            "multiplePeople",
            "extremeProfile",
            "blurLevel",
            "watermarkDetected",
            "cutoutOrRenderDetected",
            "poseType",
            "lighting",
            "perceivedSharpness",
            "recreationSuitability",
            "identityDescriptor",
            "identityEmbedding",
            "recommendationReason",
          ],
          properties: {
            faceVisible: { type: "boolean" },
            facePartiallyCovered: { type: "boolean" },
            faceCount: { type: "integer" },
            multiplePeople: { type: "boolean" },
            extremeProfile: { type: "boolean" },
            blurLevel: { type: "string", enum: ["low", "medium", "high"] },
            watermarkDetected: { type: "boolean" },
            cutoutOrRenderDetected: { type: "boolean" },
            poseType: { type: "string", enum: ["frontal", "semi_profile", "profile", "unknown"] },
            lighting: { type: "string", enum: ["poor", "fair", "good", "excellent"] },
            perceivedSharpness: { type: "string", enum: ["poor", "fair", "good", "excellent"] },
            recreationSuitability: { type: "string", enum: ["low", "medium", "high"] },
            identityDescriptor: { type: "string" },
            identityEmbedding: {
              type: "array",
              minItems: 32,
              maxItems: 2048,
              items: { type: "number", minimum: -1, maximum: 1 },
            },
            recommendationReason: { type: "string" },
          },
          additionalProperties: false,
        },
      },
    });

    const text = readResponseText(response);
    if (!text) {
      throw new AppError("EMPTY_IDENTITY_ANALYSIS", "Gemini devolvio analisis vacio para imagen de identidad", 502);
    }

    const parsed = identityImageMultimodalSchema.safeParse(parseJsonFromText(text));

    if (!parsed.success) {
      throw new AppError("INVALID_IDENTITY_ANALYSIS", "Gemini devolvio analisis invalido de identidad", 502, parsed.error.issues);
    }

    return {
      analysis: parsed.data,
      raw: response,
    };
  }

  async validateGeneratedVariant(input: {
    generatedImage: { imageBase64: string; mimeType: string };
    referenceImage: { imageBase64: string; mimeType: string };
    identityImages: Array<{ imageBase64: string; mimeType: string }>;
    referenceAnalysis: {
      shotType: string;
      cameraAngle: string;
      composition: string;
      poseDescription: string;
      facialExpression: string;
      gazeDirection: string;
      lighting: string;
      environment: string;
      wardrobe: string;
      colorPalette: string[];
      mood: string;
      realismLevel: string;
      importantDoNotChangeElements: string[];
      backgroundDescription: string;
      bodyVisibility: string;
      styleKeywords: string[];
      subjectCount: number;
      singlePersonClear: boolean;
      primaryFaceVisible: boolean;
      heldObjects: string[];
      compositionLockNotes: string[];
      referenceQuality: "low" | "medium" | "high";
    };
    identityProfileSummary: string;
  }) {
    const client = getGeminiClient();
    const models = getGeminiModelNames();

    const response = await client.models.generateContent({
      model: models.text,
      contents: [
        validateGeneratedVariantPrompt({
          referenceAnalysis: input.referenceAnalysis,
          identityProfileSummary: input.identityProfileSummary,
        }),
        createPartFromBase64(input.generatedImage.imageBase64, input.generatedImage.mimeType),
        createPartFromBase64(input.referenceImage.imageBase64, input.referenceImage.mimeType),
        ...input.identityImages.map((item) => createPartFromBase64(item.imageBase64, item.mimeType)),
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          required: [
            "identitySimilarityScore",
            "referenceCompositionScore",
            "backgroundPreservationScore",
            "poseMatchScore",
            "overallAcceptanceScore",
            "accepted",
            "rejectionReason",
          ],
          properties: {
            identitySimilarityScore: { type: "integer", minimum: 0, maximum: 100 },
            referenceCompositionScore: { type: "integer", minimum: 0, maximum: 100 },
            backgroundPreservationScore: { type: "integer", minimum: 0, maximum: 100 },
            poseMatchScore: { type: "integer", minimum: 0, maximum: 100 },
            overallAcceptanceScore: { type: "integer", minimum: 0, maximum: 100 },
            accepted: { type: "boolean" },
            rejectionReason: { type: ["string", "null"] },
          },
          additionalProperties: false,
        },
      },
    });

    const text = readResponseText(response);
    if (!text) {
      throw new AppError("EMPTY_VARIANT_VALIDATION", "Gemini devolvio validacion vacia de variante", 502);
    }

    const parsed = variantValidationSchema.safeParse(parseJsonFromText(text));
    if (!parsed.success) {
      throw new AppError("INVALID_VARIANT_VALIDATION", "Gemini devolvio validacion de variante invalida", 502, parsed.error.issues);
    }

    return {
      validation: parsed.data,
      raw: response,
    };
  }
}
