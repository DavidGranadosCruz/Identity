"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

interface NavItem {
  href: string;
  label: string;
}

function ThemeSwitcher() {
  const { theme, setTheme, t } = useAppPreferences();

  return (
    <div className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
          theme === "light"
            ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
            : "text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
        aria-label={t("header.light")}
      >
        <Sun className="size-3.5" />
        <span className="hidden sm:inline">{t("header.light")}</span>
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
          theme === "dark"
            ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
            : "text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
        aria-label={t("header.dark")}
      >
        <Moon className="size-3.5" />
        <span className="hidden sm:inline">{t("header.dark")}</span>
      </button>
    </div>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale, t } = useAppPreferences();

  return (
    <div className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1">
      <button
        type="button"
        onClick={() => setLocale("es")}
        className={cn(
          "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
          locale === "es"
            ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
            : "text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
        aria-label={t("header.es")}
      >
        {t("header.es")}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={cn(
          "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
          locale === "en"
            ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
            : "text-[var(--muted)] hover:text-[var(--foreground)]",
        )}
        aria-label={t("header.en")}
      >
        {t("header.en")}
      </button>
    </div>
  );
}

function HeaderNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-[var(--surface-muted)] text-[var(--foreground)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppHeader() {
  const { data: session, status } = useSession();
  const { t } = useAppPreferences();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthenticated = status === "authenticated" && Boolean(session?.user?.id);
  const primaryNav: NavItem[] = isAuthenticated
    ? [
        { href: "/dashboard/identity-pack", label: t("nav.identityPack") },
        { href: "/dashboard/new-recreation", label: t("nav.newRecreation") },
        { href: "/generation-history", label: t("nav.generationHistory") },
      ]
    : [{ href: "/", label: t("nav.home") }];

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border)] bg-[var(--surface)]/92 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center gap-3 px-4 sm:px-6">
        <Link
          href={isAuthenticated ? "/dashboard/identity-pack" : "/"}
          className="shrink-0 text-lg font-semibold tracking-[-0.02em] text-[var(--foreground)]"
        >
          {t("common.appName")}
        </Link>

        <div className="hidden min-w-0 flex-1 items-center md:flex">
          <HeaderNav items={primaryNav} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeSwitcher />

          {isAuthenticated ? (
            <div className="hidden items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 md:flex">
              <p className="max-w-[180px] truncate px-1 text-xs text-[var(--muted)]">
                {session?.user?.name ?? session?.user?.email ?? t("header.userMenu")}
              </p>
              <Button type="button" size="sm" variant="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>
                {t("nav.logout")}
              </Button>
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Button asChild size="sm" variant="ghost">
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t("nav.register")}</Link>
              </Button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((current) => !current)}
            className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)] md:hidden"
            aria-label={mobileOpen ? t("header.closeMenu") : t("header.openMenu")}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-[var(--border)] bg-[var(--surface)] p-3 md:hidden">
          <div className="space-y-2">
            <HeaderNav items={primaryNav} onNavigate={() => setMobileOpen(false)} />
            <div className="pt-1">
              {isAuthenticated ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(false);
                    void signOut({ callbackUrl: "/login" });
                  }}
                >
                  {t("nav.logout")}
                </Button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline">
                    <Link href="/login" onClick={() => setMobileOpen(false)}>
                      {t("nav.login")}
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register" onClick={() => setMobileOpen(false)}>
                      {t("nav.register")}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
