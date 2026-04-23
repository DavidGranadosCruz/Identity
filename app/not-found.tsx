"use client";

import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export default function NotFound() {
  const { t } = useAppPreferences();

  return (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/84 p-8 shadow-[0_22px_80px_-46px_rgba(2,8,23,0.5)] backdrop-blur-[16px]">
        <p className="text-sm text-[var(--muted)]">404</p>
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">{t("errors.notFoundTitle")}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t("errors.notFoundDescription")}</p>
      </div>
    </div>
  );
}
