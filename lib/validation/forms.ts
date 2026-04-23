import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z
  .object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export const createIdentityPackSchema = z.object({
  name: z.string().min(2).max(80),
  packId: z.string().optional(),
});

export const renameIdentityPackSchema = z.object({
  name: z.string().min(2).max(80),
});

export const analyzeIdentityPackSchema = z.object({
  imageIds: z.array(z.string().min(1)).optional(),
});

export const createGenerationSchema = z.object({
  packId: z.string().min(1),
  referenceImageId: z.string().min(1),
  referenceFidelity: z.number().int().min(0).max(100),
  identityStrength: z.number().int().min(0).max(100),
  selectedIdentityImageIds: z.array(z.string().min(1)).min(1).max(12).optional(),
});

export const patchUserSettingsSchema = z.object({
  defaultFidelity: z.number().int().min(0).max(100),
  defaultIdentityStrength: z.number().int().min(0).max(100),
  watermarkEnabled: z.boolean(),
  themePreference: z.enum(["system", "light", "dark"]).optional(),
  languagePreference: z.enum(["es", "en"]).optional(),
});

export const patchUserPreferencesSchema = z.object({
  themePreference: z.enum(["system", "light", "dark"]),
  languagePreference: z.enum(["es", "en"]),
});

export const patchGenerationSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "El titulo no puede estar vacio")
    .max(120, "El titulo no puede superar 120 caracteres"),
});
