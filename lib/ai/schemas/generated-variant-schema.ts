import { z } from "zod";

export const generatedVariantSchema = z.object({
  variantType: z.enum(["faithful", "editorial", "cinematic"]),
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
  model: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export type GeneratedVariantSchema = z.infer<typeof generatedVariantSchema>;

