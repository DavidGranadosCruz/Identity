import { cn } from "@/lib/utils/cn";

export function SectionHeader({ title, description, className }: { title: string; description?: string; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <h1 className="text-3xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">{title}</h1>
      {description ? <p className="text-sm text-[var(--muted)]">{description}</p> : null}
    </div>
  );
}

