import type {
  GenerationVariantType,
  IdentityImageMultimodalAnalysis,
  ReferenceAnalysis,
  VariantValidationResult,
} from "@/types/domain";

export interface AIImageAnalysisProvider {
  analyzeReferenceImage(input: {
    imageBase64: string;
    mimeType: string;
  }): Promise<{ analysis: ReferenceAnalysis; raw: unknown }>;

  analyzeIdentityImage(input: {
    imageBase64: string;
    mimeType: string;
  }): Promise<{ analysis: IdentityImageMultimodalAnalysis; raw: unknown }>;

  validateGeneratedVariant(input: {
    generatedImage: { imageBase64: string; mimeType: string };
    referenceImage: { imageBase64: string; mimeType: string };
    identityImages: Array<{ imageBase64: string; mimeType: string }>;
    referenceAnalysis: ReferenceAnalysis;
    identityProfileSummary: string;
  }): Promise<{ validation: VariantValidationResult; raw: unknown }>;
}

export interface AIIdentityImageSelector {
  selectBestImages(input: {
    referenceAnalysis: ReferenceAnalysis;
    candidates: Array<{
      id: string;
      score: number;
      identityConsistencyScore: number;
      isIdentityValid: boolean;
      tags: string[];
      warnings: string[];
    }>;
  }): Promise<{
    selectedImageIds: string[];
    rationale: string;
    rejectedImageReasons: Array<{ imageId: string; reason: string }>;
    raw: unknown;
  }>;
}

export interface AIImageGenerationProvider {
  generateVariant(input: {
    variantType: GenerationVariantType;
    prompt: string;
    referenceImage: { imageBase64: string; mimeType: string };
    identityImages: Array<{ imageBase64: string; mimeType: string }>;
  }): Promise<{
    imageBase64: string;
    mimeType: string;
    model: string;
    raw: unknown;
  }>;
}

export interface AIModerationProvider {
  moderate(input: {
    prompt: string;
    referenceImageBase64: string;
    referenceMimeType: string;
  }): Promise<{ approved: boolean; reason: string; blockedCategories: string[]; raw: unknown }>;
}