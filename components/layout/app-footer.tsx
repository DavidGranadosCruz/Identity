"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function AppFooter() {
  const { status } = useSession();
  const { t } = useAppPreferences();
  const isAuthenticated = status === "authenticated";

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]/72">
      <div className="mx-auto flex w-full max-w-[1260px] flex-col gap-4 px-4 py-6 text-sm text-[var(--muted)] sm:px-6 lg:px-10 md:flex-row md:items-center md:justify-between">
        <p>{t("landing.footerDescription", { year: new Date().getFullYear() })}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={isAuthenticated ? "/dashboard/identity-pack" : "/"} className="hover:text-[var(--foreground)]">
            {t("nav.home")}
          </Link>
          <Link href={isAuthenticated ? "/generation-history" : "/login"} className="hover:text-[var(--foreground)]">
            {isAuthenticated ? t("nav.generationHistory") : t("nav.login")}
          </Link>
          <span className="text-[var(--border)]">|</span>
          <span>
            {t("landing.developerProfile")}: {t("landing.developerName")}
          </span>
          <a
            href="https://github.com/DavidGranadosCruz"
            className="hover:text-[var(--foreground)]"
            target="_blank"
            rel="noreferrer"
          >
            {t("landing.github")}
          </a>
          <a
            href="https://www.linkedin.com/in/david-granados-cruz-46172434a"
            className="hover:text-[var(--foreground)]"
            target="_blank"
            rel="noreferrer"
          >
            {t("landing.linkedin")}
          </a>
        </div>
      </div>
    </footer>
  );
}
