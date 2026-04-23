"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { type AppLocale, type ResolvedTheme, type ThemePreference } from "@/lib/i18n/messages";
import { createTranslator, normalizeLocale } from "@/lib/i18n/translate";
import { LOCALE_COOKIE_KEY, THEME_COOKIE_KEY } from "@/lib/i18n/constants";

const THEME_STORAGE_KEY = "identity.theme";
const LOCALE_STORAGE_KEY = "identity.locale";

interface AppPreferencesContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  theme: ResolvedTheme;
  themePreference: ThemePreference;
  setTheme: (theme: ResolvedTheme) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(null);

function normalizeThemePreference(value: string | null | undefined): ThemePreference {
  if (value === "light" || value === "dark" || value === "system") {
    return value;
  }
  return "system";
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`;
}

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function AppPreferencesInner({
  children,
  initialLocale,
  initialThemePreference,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
  initialThemePreference: ThemePreference;
}) {
  const { status } = useSession();
  const [locale, setLocaleState] = useState<AppLocale>(normalizeLocale(initialLocale));
  const [themePreference, setThemePreference] = useState<ThemePreference>(normalizeThemePreference(initialThemePreference));
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>("light");
  const lastSyncedRef = useRef<string | null>(null);

  useEffect(() => {
    const localeFromStorage = normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    setLocaleState(localeFromStorage);

    const themeFromStorage = normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
    setThemePreference(themeFromStorage);
    setSystemTheme(resolveSystemTheme());
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(media.matches ? "dark" : "light");
    update();

    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const theme: ResolvedTheme = themePreference === "system" ? systemTheme : themePreference;

  useEffect(() => {
    document.documentElement.setAttribute("lang", locale);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [locale, theme]);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    writeCookie(LOCALE_COOKIE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    window.localStorage.setItem(THEME_STORAGE_KEY, themePreference);
    writeCookie(THEME_COOKIE_KEY, themePreference);
  }, [themePreference]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const syncKey = `${themePreference}:${locale}`;
    if (lastSyncedRef.current === syncKey) return;

    lastSyncedRef.current = syncKey;
    void fetch("/api/user-settings/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        themePreference,
        languagePreference: locale,
      }),
    }).catch(() => {
      lastSyncedRef.current = null;
    });
  }, [status, themePreference, locale]);

  const value = useMemo<AppPreferencesContextValue>(() => {
    return {
      locale,
      setLocale: (nextLocale) => setLocaleState(normalizeLocale(nextLocale)),
      theme,
      themePreference,
      setTheme: (nextTheme) => setThemePreference(nextTheme),
      t: createTranslator(locale),
    };
  }, [locale, theme, themePreference]);

  return <AppPreferencesContext.Provider value={value}>{children}</AppPreferencesContext.Provider>;
}

export function AppPreferencesProvider({
  children,
  initialLocale,
  initialThemePreference,
  session,
}: {
  children: React.ReactNode;
  initialLocale: AppLocale;
  initialThemePreference: ThemePreference;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <AppPreferencesInner initialLocale={initialLocale} initialThemePreference={initialThemePreference}>
        {children}
      </AppPreferencesInner>
    </SessionProvider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);
  if (!context) {
    throw new Error("useAppPreferences must be used inside AppPreferencesProvider");
  }
  return context;
}
