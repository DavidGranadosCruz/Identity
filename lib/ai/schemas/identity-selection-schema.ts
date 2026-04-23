import { z } from "zod";

export const identityImageSelectionSchema = z.object({
  selectedImageIds: z.array(z.string().min(1)).min(1).max(12),
  rationale: z.string().min(1),
  rejectedImageReasons: z.array(
    z.object({
      imageId: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
});

export type IdentityImageSelectionSchema = z.infer<typeof identityImageSelectionSchema>;