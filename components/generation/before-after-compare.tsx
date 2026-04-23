/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function BeforeAfterCompare({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  const { t } = useAppPreferences();
  const [position, setPosition] = useState(50);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs font-semibold tracking-[0.2em] text-[var(--muted)]">
        <p>{t("generation.before")}</p>
        <p className="text-right">{t("generation.after")}</p>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90">
        <img src={before} alt={t("generation.beforeAlt")} className="w-full" />
        <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
          <img src={after} alt={t("generation.afterAlt")} className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-y-0" style={{ left: `${position}%` }}>
          <div className="h-full w-px bg-[var(--primary)]/70" />
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(event) => setPosition(Number(event.target.value))}
        className="h-2 w-full appearance-none rounded-full bg-[var(--surface-muted)] accent-[var(--primary)]"
      />
    </div>
  );
}
