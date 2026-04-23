import { GeminiImageAnalysisProvider } from "@/lib/ai/providers/gemini-image-analysis-provider";

export function createAiProviders() {
  return {
    analysisProvider: new GeminiImageAnalysisProvider(),
  };
}

