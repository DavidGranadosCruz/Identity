import { GenerationDetailPageShell } from "@/components/generation/generation-detail-page-shell";
import { requireDashboardUserId } from "@/server/services/auth-context-service";
import { GenerationService } from "@/server/services/generation-service";

export const dynamic = "force-dynamic";

export default async function GenerationDetailPage({ params }: { params: Promise<{ generationId: string }> }) {
  const { generationId } = await params;
  const userId = await requireDashboardUserId();
  const bundle = await new GenerationService().getById(userId, generationId);

  return <GenerationDetailPageShell bundle={bundle} />;
}
