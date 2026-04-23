import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-[var(--muted)]">
          <Info className="size-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
          <p className="max-w-sm text-sm text-[var(--muted)]">{description}</p>
        </div>
        {actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : null}
      </CardContent>
    </Card>
  );
}

