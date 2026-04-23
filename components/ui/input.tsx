import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Input({ className, type, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-[var(--input-border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
        className,
      )}
      {...props}
    />
  );
}



