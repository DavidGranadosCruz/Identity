"use client";

import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Clock3, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

const acceptValue = "image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.avif,.heic,.heif";

function formatElapsedMs(value: number | null) {
  if (value === null || Number.isNaN(value) || value < 0) return "N/D";
  return `${new Intl.NumberFormat("de-DE").format(Math.round(value))} ms`;
}

function statusLabel(status: "completed" | "failed" | "running" | "pending") {
  if (status === "completed") return "completed";
  if (status === "failed") return "failed";
  if (status === "running") return "running";
  return "pending";
}

export function IdentityPackUploader({
  fileCount,
  uploading,
  progress,
  processingFeed,
  onPickFiles,
}: {
  fileCount: number;
  uploading?: boolean;
  progress?: number;
  processingFeed?: Array<{
    label: string;
    status: "completed" | "failed" | "running" | "pending";
    elapsedMs: number | null;
  }>;
  onPickFiles: (files: File[]) => void;
}) {
  const { t } = useAppPreferences();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uploadStatusText = useMemo(() => {
    if (uploading) return t("identity.uploaderUploading");
    if (fileCount === 0) return t("identity.uploaderEmpty");
    return t("identity.uploaderPrepared", { count: fileCount });
  }, [fileCount, uploading, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.34, ease: "easeOut" }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onPickFiles(Array.from(event.dataTransfer.files));
      }}
      className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/88 p-6 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.22)] backdrop-blur-[18px]"
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptValue}
        multiple
        className="hidden"
        onChange={(event) => {
          onPickFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/80 p-6 text-center">
        <div className="rounded-full bg-[var(--primary)] p-3 text-[var(--primary-foreground)] shadow-lg">
          <UploadCloud className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-[var(--foreground)]">{t("identity.uploaderTitle")}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{uploadStatusText}</p>
          <p className="text-xs text-[var(--muted)]">{t("identity.uploaderFormats")}</p>
        </div>
        <Button type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {t("identity.selectImages")}
        </Button>
      </div>

      {uploading ? <Progress className="h-2" value={progress ?? 0} /> : null}

      {processingFeed?.length ? (
        <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
            <Clock3 className="size-4" />
            {t("identity.processingFeed")}
          </div>
          <div className="space-y-1.5">
            {processingFeed.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted-foreground)] transition-all hover:bg-[var(--surface)]"
              >
                <p className="truncate pr-2">{item.label}</p>
                <div className="flex items-center gap-2 whitespace-nowrap">
                  <span className="uppercase text-[var(--muted)]">{statusLabel(item.status)}</span>
                  <span className="font-mono font-semibold text-[var(--foreground)]">
                    {formatElapsedMs(item.elapsedMs)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
