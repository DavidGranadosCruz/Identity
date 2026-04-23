"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function BackHomeLink() {
  const { t } = useAppPreferences();

  return (
    <Link
      href="/"
      className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
    >
      <ArrowLeft className="size-4" />
      {t("auth.backToLanding")}
    </Link>
  );
}
