import { NewRecreationWorkspace } from "@/components/generation/new-recreation-workspace";
import { requireDashboardUserId } from "@/server/services/auth-context-service";
import { IdentityPackService } from "@/server/services/identity-pack-service";
import { ReferenceService } from "@/server/services/reference-service";
import { SettingsService } from "@/server/services/settings-service";

export const dynamic = "force-dynamic";

export default async function NewRecreationPage({
  searchParams,
}: {
  searchParams: Promise<{ packId?: string }>;
}) {
  const userId = await requireDashboardUserId();
  const { packId } = await searchParams;

  const [packWorkspace, reference, settings] = await Promise.all([
    new IdentityPackService().getPackWorkspace(userId, packId ?? null),
    new ReferenceService().getLatestReference(userId),
    new SettingsService().getByUser(userId),
  ]);

  return (
    <NewRecreationWorkspace
      initialPacks={packWorkspace.packs}
      initialSelectedPackId={packWorkspace.selectedPackId}
      initialPackData={packWorkspace.packData}
      initialReference={reference}
      settings={settings}
    />
  );
}
