import * as React from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { auth } from "@/lib/auth/auth";
import { LOCALE_COOKIE_KEY, THEME_COOKIE_KEY } from "@/lib/i18n/constants";
import { normalizeThemePreference, resolveLocaleWithFallback } from "@/lib/i18n/server";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { AppPreferencesProvider } from "@/components/providers/app-preferences-provider";
import { ToastProvider } from "@/components/providers/toast-provider";
import { SettingsService } from "@/server/services/settings-service";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Identity - Photo Recreation Studio",
  description:
    "Identity is an open-source web app for identity-preserving photo recreation. Upload your photos, add a reference and generate your own realistic version.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const settingsService = new SettingsService();
  const userId = session?.user?.id;
  const settings = userId ? await settingsService.getByUser(userId).catch(() => null) : null;

  const cookieStore = await cookies();
  const localeFromCookie = cookieStore.get(LOCALE_COOKIE_KEY)?.value;
  const themeFromCookie = cookieStore.get(THEME_COOKIE_KEY)?.value;

  const initialLocale = resolveLocaleWithFallback(localeFromCookie ?? settings?.languagePreference ?? "es");
  const initialThemePreference = normalizeThemePreference(themeFromCookie ?? settings?.themePreference ?? "system");

  return (
    <html lang={initialLocale} data-theme="light" className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)] antialiased">
        <AppPreferencesProvider
          initialLocale={initialLocale}
          initialThemePreference={initialThemePreference}
          session={session}
        >
          <AppHeader />
          <div className="min-h-screen pt-16">{children}</div>
          <AppFooter />
          <ToastProvider />
        </AppPreferencesProvider>
      </body>
    </html>
  );
}

