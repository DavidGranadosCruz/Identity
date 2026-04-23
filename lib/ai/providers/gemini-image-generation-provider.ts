import {
  createPartFromBase64,
  createPartFromText,
  Modality,
  RawReferenceImage,
  SubjectReferenceImage,
  SubjectReferenceType,
} from "@google/genai";
import { AppError } from "@/lib/utils/errors";
import { getGeminiClient, getGeminiModelNames } from "@/lib/ai/providers/gemini-client";
import type { AIImageGenerationProvider } from "@/lib/ai/providers/types";

function normalizeModelName(name: string) {
  return name.startsWith("models/") ? name.slice("models/".length) : name;
}

function readImageFromGenerateContent(response: unknown) {
  if (response && typeof response === "object" && "data" in response && typeof response.data === "string") {
    return {
      imageBase64: response.data,
      mimeType: "image/png",
    };
  }

  const candidates =
    response && typeof response === "object" && "candidates" in response && Array.isArray(response.candidates)
      ? response.candidates
      : [];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object" || !("content" in candidate)) continue;

    const content = candidate.content;
    if (!content || typeof content !== "object" || !("parts" in content) || !Array.isArray(content.parts)) continue;

    for (const part of content.parts) {
      if (!part || typeof part !== "object" || !("inlineData" in part)) continue;
      const inlineData = part.inlineData;
      if (!inlineData || typeof inlineData !== "object") continue;

      const data = "data" in inlineData && typeof inlineData.data === "string" ? inlineData.data : null;
      const mimeType = "mimeType" in inlineData && typeof inlineData.mimeType === "string" ? inlineData.mimeType : null;

      if (data) {
        return {
          imageBase64: data,
          mimeType: mimeType ?? "image/png",
        };
      }
    }
  }

  return null;
}

function summarizeGenerateContentNoImage(response: unknown) {
  const candidates =
    response && typeof response === "object" && "candidates" in response && Array.isArray(response.candidates)
      ? response.candidates
      : [];

  if (!candidates.length) {
    return "empty_candidates";
  }

  const reasons = candidates
    .map((candidate) => {
      if (!candidate || typeof candidate !== "object") return "unknown";
      const reason =
        "finishReason" in candidate && typeof candidate.finishReason === "string" ? candidate.finishReason : "unknown";
      const message =
        "finishMessage" in candidate && typeof candidate.finishMessage === "string" ? candidate.finishMessage : "";
      return message ? `${reason} (${message})` : reason;
    })
    .join(", ");

  return reasons || "unknown_reason";
}

function buildGenerateContentModelCandidates(primaryModel: string) {
  const normalizedPrimary = normalizeModelName(primaryModel);
  return Array.from(
    new Set([normalizedPrimary, "gemini-2.5-flash-image", "gemini-3.1-flash-image-preview"]),
  );
}

function buildEditModelCandidates(primaryModel: string) {
  const normalizedPrimary = normalizeModelName(primaryModel);
  return Array.from(
    new Set([normalizedPrimary, "imagen-3.0-capability-001", "gemini-2.5-flash-image", "gemini-3.1-flash-image-preview"]),
  );
}

function buildSceneAndIdentityReferences(input: {
  referenceImage: { imageBase64: string; mimeType: string };
  identityImages: Array<{ imageBase64: string; mimeType: string }>;
}) {
  const sceneReference = new RawReferenceImage();
  sceneReference.referenceImage = {
    imageBytes: input.referenceImage.imageBase64,
    mimeType: input.referenceImage.mimeType,
  };

  const identityReferences = input.identityImages.slice(0, 8).map((item) => {
    const identityReference = new SubjectReferenceImage();
    identityReference.referenceImage = {
      imageBytes: item.imageBase64,
      mimeType: item.mimeType,
    };
    identityReference.config = {
      subjectType: SubjectReferenceType.SUBJECT_TYPE_PERSON,
      subjectDescription: "Primary identity source for subject replacement",
    };
    return identityReference;
  });

  return [sceneReference, ...identityReferences];
}

function readImageFromEditResponse(response: unknown) {
  if (!response || typeof response !== "object" || !("generatedImages" in response) || !Array.isArray(response.generatedImages)) {
    return null;
  }

  const first = response.generatedImages[0];
  if (!first || typeof first !== "object" || !("image" in first) || !first.image || typeof first.image !== "object") {
    return null;
  }

  const imageBytes = "imageBytes" in first.image && typeof first.image.imageBytes === "string" ? first.image.imageBytes : null;
  const mimeType = "mimeType" in first.image && typeof first.image.mimeType === "string" ? first.image.mimeType : null;

  if (!imageBytes) return null;

  return {
    imageBase64: imageBytes,
    mimeType: mimeType ?? "image/png",
  };
}

function summarizeEditNoImage(response: unknown) {
  if (!response || typeof response !== "object" || !("generatedImages" in response) || !Array.isArray(response.generatedImages)) {
    return "no_generated_images";
  }

  const reasons = response.generatedImages
    .map((image) => {
      if (!image || typeof image !== "object") return null;
      return "raiFilteredReason" in image && typeof image.raiFilteredReason === "string" ? image.raiFilteredReason : null;
    })
    .filter((reason): reason is string => Boolean(reason));

  return reasons.length ? reasons.join(", ") : "empty_generated_images";
}

export class GeminiImageGenerationProvider implements AIImageGenerationProvider {
  async generateVariant(input: {
    variantType: "faithful" | "editorial" | "cinematic";
    prompt: string;
    referenceImage: { imageBase64: string; mimeType: string };
    identityImages: Array<{ imageBase64: string; mimeType: string }>;
  }) {
    if (!input.identityImages.length) {
      throw new AppError("IDENTITY_IMAGES_REQUIRED", "Identity images are required to generate a variant", 422);
    }

    const client = getGeminiClient();
    const models = getGeminiModelNames();
    const editCandidates = buildEditModelCandidates(models.image);
    const contentCandidates = buildGenerateContentModelCandidates(models.image);
    const attemptErrors: string[] = [];
    const referenceImages = buildSceneAndIdentityReferences({
      referenceImage: input.referenceImage,
      identityImages: input.identityImages,
    });

    for (const model of editCandidates) {
      try {
        const response = await client.models.editImage({
          model,
          prompt: input.prompt,
          referenceImages,
          config: {
            numberOfImages: 1,
            outputMimeType: "image/png",
          },
        });

        const image = readImageFromEditResponse(response);
        if (!image) {
          throw new Error(`Model returned no image data (${summarizeEditNoImage(response)})`);
        }

        return {
          imageBase64: image.imageBase64,
          mimeType: image.mimeType,
          model,
          raw: response,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        attemptErrors.push(`[editImage:${model}] ${message}`);
      }
    }

    for (const model of contentCandidates) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: [
            createPartFromText(input.prompt),
            createPartFromText(
              "Return a single photorealistic image. Keep scene lock from reference and identity lock from identity images.",
            ),
            createPartFromBase64(input.referenceImage.imageBase64, input.referenceImage.mimeType),
            ...input.identityImages.map((item) => createPartFromBase64(item.imageBase64, item.mimeType)),
          ],
          config: {
            responseModalities: [Modality.IMAGE],
            imageConfig: {
              aspectRatio: "3:4",
            },
          },
        });

        const image = readImageFromGenerateContent(response);
        if (!image) {
          throw new Error(`Model returned no image data (${summarizeGenerateContentNoImage(response)})`);
        }

        return {
          imageBase64: image.imageBase64,
          mimeType: image.mimeType,
          model,
          raw: response,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        attemptErrors.push(`[generateContent:${model}] ${message}`);
      }
    }

    throw new AppError(
      "GEMINI_IMAGE_GENERATION_FAILED",
      `All identity-locked generation attempts failed: ${attemptErrors.join(" | ")}`,
      502,
    );
  }
}
