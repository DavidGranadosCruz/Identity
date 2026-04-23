"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function IdentityQualityGuidelines() {
  const { t } = useAppPreferences();
  const tips = [
    t("identity.qualityTip1"),
    t("identity.qualityTip2"),
    t("identity.qualityTip3"),
    t("identity.qualityTip4"),
    t("identity.qualityTip5"),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("identity.qualityGuideTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-[var(--muted-foreground)]">
          {tips.map((tip) => (
            <li
              key={tip}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
            >
              {tip}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
