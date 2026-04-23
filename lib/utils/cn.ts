import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatScore(score: number) {
  return `${Math.round(score)} / 100`;
}

export function formatDateLabel(value: string, locale: "es" | "en" = "es") {
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatMilliseconds(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/D";
  return `${new Intl.NumberFormat("de-DE").format(Math.round(value))} ms`;
}

