"use client";

import { Toaster } from "sonner";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

export function ToastProvider() {
  const { theme } = useAppPreferences();

  return (
    <Toaster
      richColors
      position="top-right"
      theme={theme}
      toastOptions={{
        style: {
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--foreground)",
        },
      }}
    />
  );
}

