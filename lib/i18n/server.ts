import { cookies } from "next/headers";
import { defaultLocale, type AppLocale } from "@/lib/i18n/messages";
import { LOCALE_COOKIE_KEY } from "@/lib/i18n/constants";
import { createTranslator, normalizeLocale } from "@/lib/i18n/translate";

export function normalizeThemePreference(input: string | null | undefined) {
  if (input === "light" || input === "dark" || input === "system") {
    return input;
  }
  return "system" as const;
}

export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const localeFromCookie = cookieStore.get(LOCALE_COOKIE_KEY)?.value;
  return normalizeLocale(localeFromCookie);
}

export async function getServerTranslator() {
  const locale = await getServerLocale();
  return {
    locale,
    t: createTranslator(locale),
  };
}

export function resolveLocaleWithFallback(input: string | null | undefined) {
  return normalizeLocale(input ?? defaultLocale);
}
