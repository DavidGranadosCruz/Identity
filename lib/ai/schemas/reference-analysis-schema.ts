import { z } from "zod";

export const referenceAnalysisSchema = z.object({
  shotType: z.string().min(1),
  cameraAngle: z.string().min(1),
  composition: z.string().min(1),
  poseDescription: z.string().min(1),
  facialExpression: z.string().min(1),
  gazeDirection: z.string().min(1),
  lighting: z.string().min(1),
  environment: z.string().min(1),
  wardrobe: z.string().min(1),
  colorPalette: z.array(z.string().min(1)).min(1),
  mood: z.string().min(1),
  realismLevel: z.string().min(1),
  importantDoNotChangeElements: z.array(z.string().min(1)).min(1),
  backgroundDescription: z.string().min(1),
  bodyVisibility: z.string().min(1),
  styleKeywords: z.array(z.string().min(1)).min(1),
  subjectCount: z.number().int().min(0).max(10),
  singlePersonClear: z.boolean(),
  primaryFaceVisible: z.boolean(),
  heldObjects: z.array(z.string().min(1)).default([]),
  compositionLockNotes: z.array(z.string().min(1)).default([]),
  referenceQuality: z.enum(["low", "medium", "high"]),
});

export type ReferenceAnalysisSchema = z.infer<typeof referenceAnalysisSchema>;