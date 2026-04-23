import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:brightness-105",
        secondary:
          "border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--foreground)] hover:bg-[var(--surface)]",
        ghost:
          "bg-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
        outline:
          "border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
        destructive:
          "border border-transparent bg-[var(--danger)] text-white shadow-sm hover:brightness-105",
      },
      size: {
        sm: "h-9 px-3",
        default: "h-10 px-4",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button, buttonVariants };

