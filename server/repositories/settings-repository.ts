import { prisma } from "@/lib/db/prisma";

export class SettingsRepository {
  async findByUser(userId: string) {
    return prisma.userSettings.findUnique({ where: { userId } });
  }

  async upsert(params: {
    userId: string;
    defaultFidelity: number;
    defaultIdentityStrength: number;
    watermarkEnabled: boolean;
    themePreference?: "system" | "light" | "dark";
    languagePreference?: "es" | "en";
  }) {
    return prisma.userSettings.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        defaultFidelity: params.defaultFidelity,
        defaultIdentityStrength: params.defaultIdentityStrength,
        watermarkEnabled: params.watermarkEnabled,
        themePreference: params.themePreference ?? "system",
        languagePreference: params.languagePreference ?? "es",
      },
      update: {
        defaultFidelity: params.defaultFidelity,
        defaultIdentityStrength: params.defaultIdentityStrength,
        watermarkEnabled: params.watermarkEnabled,
        themePreference: params.themePreference,
        languagePreference: params.languagePreference,
      },
    });
  }

  async updatePreferences(params: {
    userId: string;
    themePreference: "system" | "light" | "dark";
    languagePreference: "es" | "en";
  }) {
    return prisma.userSettings.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        themePreference: params.themePreference,
        languagePreference: params.languagePreference,
      },
      update: {
        themePreference: params.themePreference,
        languagePreference: params.languagePreference,
      },
    });
  }

  async createDefaults(userId: string) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
      },
      update: {},
    });
  }
}

