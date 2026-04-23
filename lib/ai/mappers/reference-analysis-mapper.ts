import { referenceAnalysisSchema } from "@/lib/ai/schemas/reference-analysis-schema";
import { parseJsonFromText } from "@/lib/utils/json";
import { AppError } from "@/lib/utils/errors";
import type { ReferenceAnalysis } from "@/types/domain";

export function mapReferenceAnalysis(rawText: string): ReferenceAnalysis {
  const parsed = parseJsonFromText<unknown>(rawText);
  const result = referenceAnalysisSchema.safeParse(parsed);

  if (!result.success) {
    throw new AppError("INVALID_REFERENCE_ANALYSIS", "La salida del análisis no cumple el schema", 502, {
      issues: result.error.issues,
      rawText,
    });
  }

  return result.data;
}

