"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className,
}: {
  value: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (next: number[]) => void;
  className?: string;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value[0] ?? min}
      onChange={(event) => onValueChange?.([Number(event.target.value)])}
      className={cn("h-2 w-full cursor-pointer appearance-none rounded-full bg-[var(--surface-muted)] accent-[var(--primary)]", className)}
    />
  );
}

