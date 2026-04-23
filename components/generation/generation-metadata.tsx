"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { GenerationVariant } from "@/types/domain";

export function GenerationMetadata({ variant }: { variant: GenerationVariant }) {
  const { t } = useAppPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("generation.metadataTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--muted-foreground)]">
          {JSON.stringify(variant.metadataJson ?? {}, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
