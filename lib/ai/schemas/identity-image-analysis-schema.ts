import { z } from "zod";

export const identityImageEmbeddingSchema = z.array(z.number().min(-1).max(1)).min(32).max(2048);

export const identityImageMultimodalSchema = z.object({
  faceVisible: z.boolean(),
  facePartiallyCovered: z.boolean(),
  faceCount: z.number().int().min(0).max(10),
  multiplePeople: z.boolean(),
  extremeProfile: z.boolean(),
  blurLevel: z.enum(["low", "medium", "high"]),
  watermarkDetected: z.boolean(),
  cutoutOrRenderDetected: z.boolean(),
  poseType: z.enum(["frontal", "semi_profile", "profile", "unknown"]),
  lighting: z.enum(["poor", "fair", "good", "excellent"]),
  perceivedSharpness: z.enum(["poor", "fair", "good", "excellent"]),
  recreationSuitability: z.enum(["low", "medium", "high"]),
  identityDescriptor: z.string().min(1),
  identityEmbedding: identityImageEmbeddingSchema,
  recommendationReason: z.string().min(1),
});

export type IdentityImageMultimodalSchema = z.infer<typeof identityImageMultimodalSchema>;
