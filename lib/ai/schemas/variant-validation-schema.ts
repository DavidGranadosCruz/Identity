import { z } from "zod";

export const variantValidationSchema = z.object({
  identitySimilarityScore: z.number().int().min(0).max(100),
  referenceCompositionScore: z.number().int().min(0).max(100),
  backgroundPreservationScore: z.number().int().min(0).max(100),
  poseMatchScore: z.number().int().min(0).max(100),
  overallAcceptanceScore: z.number().int().min(0).max(100),
  accepted: z.boolean(),
  rejectionReason: z.string().nullable(),
});

export type VariantValidationSchema = z.infer<typeof variantValidationSchema>;
