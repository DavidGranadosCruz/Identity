import { SettingsRepository } from "@/server/repositories/settings-repository";
import { mapUserSettings } from "@/server/mappers/domain-mappers";

const settingsRepository = new SettingsRepository();

export class SettingsService {
  async getByUser(userId: string) {
    const settings = await settingsRepository.findByUser(userId);
    if (settings) return mapUserSettings(settings);

    const created = await settingsRepository.createDefaults(userId);
    return mapUserSettings(created);
  }

  async update(userId: string, payload: {
    defaultFidelity: number;
    defaultIdentityStrength: number;
    watermarkEnabled: boolean;
    themePreference?: "system" | "light" | "dark";
    languagePreference?: "es" | "en";
  }) {
    const updated = await settingsRepository.upsert({
      userId,
      defaultFidelity: payload.defaultFidelity,
      defaultIdentityStrength: payload.defaultIdentityStrength,
      watermarkEnabled: payload.watermarkEnabled,
      themePreference: payload.themePreference,
      languagePreference: payload.languagePreference,
    });

    return mapUserSettings(updated);
  }

  async updatePreferences(userId: string, payload: {
    themePreference: "system" | "light" | "dark";
    languagePreference: "es" | "en";
  }) {
    const updated = await settingsRepository.updatePreferences({
      userId,
      themePreference: payload.themePreference,
      languagePreference: payload.languagePreference,
    });

    return mapUserSettings(updated);
  }
}

