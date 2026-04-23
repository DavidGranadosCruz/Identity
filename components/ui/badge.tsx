import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      default: "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)] backdrop-blur",
      success: "border border-[var(--border)] bg-[color-mix(in_srgb,var(--success)_16%,var(--surface))] text-[var(--success)] backdrop-blur",
      warning: "border border-[var(--border)] bg-[color-mix(in_srgb,var(--warning)_18%,var(--surface))] text-[var(--warning)] backdrop-blur",
      danger: "border border-[var(--border)] bg-[color-mix(in_srgb,var(--danger)_18%,var(--surface))] text-[var(--danger)] backdrop-blur",
      accent: "border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))] text-[var(--primary)] backdrop-blur",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}



