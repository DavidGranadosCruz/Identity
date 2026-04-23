import { GenerationHistoryPageShell } from "@/components/generation/generation-history-page-shell";
import { requireDashboardUserId } from "@/server/services/auth-context-service";
import { GenerationService } from "@/server/services/generation-service";

export const dynamic = "force-dynamic";

export default async function GenerationHistoryPage() {
  const userId = await requireDashboardUserId();
  const items = await new GenerationService().listByUser(userId);

  return <GenerationHistoryPageShell items={items} />;
}
