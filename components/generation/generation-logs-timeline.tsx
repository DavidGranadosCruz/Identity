"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateLabel } from "@/lib/utils/cn";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { Job } from "@/types/domain";

function localStatus(status: Job["status"], t: (key: string) => string) {
  if (status === "pending") return t("common.statusQueued");
  if (status === "running") return t("common.statusRunning");
  if (status === "completed") return t("common.statusCompleted");
  return t("common.statusFailed");
}

export function GenerationLogsTimeline({ jobs }: { jobs: Job[] }) {
  const { t, locale } = useAppPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("generation.timelineTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 p-3">
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium text-[var(--foreground)]">{job.type}</p>
              <p className="text-[var(--muted)]">{formatDateLabel(job.createdAt, locale)}</p>
            </div>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {t("generation.statusPrefix")}: {localStatus(job.status, t)}
            </p>
            {job.status === "failed" && job.errorMessage ? (
              <p className="mt-1 text-xs text-[var(--danger)]">{job.errorMessage}</p>
            ) : null}
            {job.status === "pending" && job.errorMessage ? (
              <p className="mt-1 text-xs text-[var(--warning)]">
                {t("generation.retryingPrefix")}: {job.errorMessage}
              </p>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
