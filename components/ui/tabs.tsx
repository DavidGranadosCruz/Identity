"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export function Tabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
}: {
  value?: string;
  defaultValue: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const activeValue = value ?? internalValue;

  return (
    <TabsContext.Provider
      value={{
        value: activeValue,
        setValue: (next) => {
          if (value === undefined) setInternalValue(next);
          onValueChange?.(next);
        },
      }}
    >
      <div className={cn("space-y-4", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1 backdrop-blur", className)} {...props} />
  );
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const context = React.useContext(TabsContext);
  if (!context) return null;

  const active = context.value === value;

  return (
    <button
      onClick={() => context.setValue(value)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-sm text-[var(--muted-foreground)] transition-colors",
        active && "bg-[var(--surface)] text-[var(--foreground)]",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const context = React.useContext(TabsContext);
  if (!context || context.value !== value) return null;

  return <div className={cn("space-y-4", className)}>{children}</div>;
}

