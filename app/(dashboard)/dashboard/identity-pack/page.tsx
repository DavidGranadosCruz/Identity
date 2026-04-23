import { IdentityPackPageClient } from "@/components/identity/identity-pack-page-client";
import { requireDashboardUserId } from "@/server/services/auth-context-service";
import { IdentityPackService } from "@/server/services/identity-pack-service";

export const dynamic = "force-dynamic";

export default async function IdentityPackPage({
  searchParams,
}: {
  searchParams: Promise<{ packId?: string }>;
}) {
  const userId = await requireDashboardUserId();
  const { packId } = await searchParams;
  const workspace = await new IdentityPackService().getPackWorkspace(userId, packId ?? null);

  return (
    <IdentityPackPageClient
      initialPacks={workspace.packs}
      initialSelectedPackId={workspace.selectedPackId}
      initialPackData={workspace.packData}
    />
  );
}
