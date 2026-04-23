import { GenerationService } from "@/server/services/generation-service";
import { IdentityPackService } from "@/server/services/identity-pack-service";
import { ReferenceService } from "@/server/services/reference-service";
import { SettingsService } from "@/server/services/settings-service";

const generationService = new GenerationService();
const identityPackService = new IdentityPackService();
const referenceService = new ReferenceService();
const settingsService = new SettingsService();

export class DashboardService {
  async getData(userId: string) {
    const [latestPackData, latestReference, generations, settings] = await Promise.all([
      identityPackService.getLatestPackWithImages(userId),
      referenceService.getLatestReference(userId),
      generationService.listByUser(userId),
      settingsService.getByUser(userId),
    ]);

    return {
      latestPack: latestPackData?.pack ?? null,
      latestReference,
      latestGeneration: generations[0] ?? null,
      settings,
    };
  }
}
