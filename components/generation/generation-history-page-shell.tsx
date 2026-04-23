"use client";

import { SectionHeader } from "@/components/dashboard/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GenerationHistoryList } from "@/components/generation/generation-history-list";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { GenerationBundle } from "@/types/domain";

export function GenerationHistoryPageShell({ items }: { items: GenerationBundle[] }) {
  const { t } = useAppPreferences();

  return (
    <div className="space-y-8">
      <SectionHeader title={t("history.title")} description={t("history.description")} />

      {items.length ? (
        <GenerationHistoryList items={items} />
      ) : (
        <EmptyState title={t("history.noHistoryTitle")} description={t("history.noHistoryDescription")} />
      )}
    </div>
  );
}
