import type { AppLocale, MessageCatalog } from "@/lib/i18n/messages";
import { defaultLocale, messages } from "@/lib/i18n/messages";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readByPath(catalog: MessageCatalog, path: string): unknown {
  const segments = path.split(".");
  let cursor: unknown = catalog;

  for (const segment of segments) {
    if (!isRecord(cursor) || !(segment in cursor)) {
      return null;
    }
    cursor = cursor[segment];
  }

  return cursor;
}

function interpolate(message: string, params?: Record<string, string | number>) {
  if (!params) return message;

  return message.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? `{${key}}` : String(value);
  });
}

export function normalizeLocale(input: string | null | undefined): AppLocale {
  return input === "en" ? "en" : defaultLocale;
}

export function createTranslator(locale: AppLocale) {
  const catalog = messages[locale] ?? messages[defaultLocale];

  return (key: string, params?: Record<string, string | number>) => {
    const raw = readByPath(catalog, key);
    if (typeof raw !== "string") {
      return key;
    }
    return interpolate(raw, params);
  };
}
