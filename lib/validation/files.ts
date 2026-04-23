import { z } from "zod";

const MB = 1024 * 1024;

export const uploadLimits = {
  minFileSizeBytes: 1,
  maxFileSizeBytes: 250 * MB,
} as const;

export const fileMetadataSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.number().int().min(uploadLimits.minFileSizeBytes).max(uploadLimits.maxFileSizeBytes),
  width: z.number().int().min(0).max(50000),
  height: z.number().int().min(0).max(50000),
});

