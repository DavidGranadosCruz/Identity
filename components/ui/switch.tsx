"use client";

import { cn } from "@/lib/utils/cn";

export function Switch({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean;
  onCheckedChange?: (next: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full border transition-colors",
        checked
          ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_35%,transparent)]"
          : "border-[var(--input-border)] bg-[var(--surface-muted)]",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-[var(--surface)] transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

