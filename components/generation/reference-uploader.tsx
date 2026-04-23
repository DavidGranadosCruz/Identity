/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { ReferenceImage } from "@/types/domain";

const acceptValue = "image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.tif,.tiff,.avif,.heic,.heif";

export function ReferenceUploader({
  reference,
  uploading,
  previewUrl,
  onPick,
}: {
  reference: ReferenceImage | null;
  uploading: boolean;
  previewUrl?: string | null;
  onPick: (file: File | null) => void;
}) {
  const { t } = useAppPreferences();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const imageSrc = previewUrl ?? reference?.imageUrl ?? null;
  const imageAlt = reference?.originalFilename ?? t("generation.referenceTitle");

  return (
    <div
      className="space-y-3 rounded-3xl border border-[var(--border)] bg-[var(--surface)]/84 p-4 shadow-[0_20px_70px_-44px_rgba(15,23,42,0.3)] backdrop-blur-xl"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onPick(event.dataTransfer.files?.[0] ?? null);
      }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--foreground)]">{t("generation.referenceTitle")}</h3>
        <input
          ref={inputRef}
          type="file"
          accept={acceptValue}
          className="hidden"
          onChange={(event) => {
            onPick(event.target.files?.[0] ?? null);
            event.currentTarget.value = "";
          }}
        />
        <Button type="button" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="size-4" />
          {uploading ? t("generation.uploading") : t("generation.upload")}
        </Button>
      </div>

      {imageSrc ? (
        <img
          src={imageSrc}
          alt={imageAlt}
          className="aspect-[4/5] w-full rounded-xl border border-[var(--border)] object-cover"
        />
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-4 text-center text-sm text-[var(--muted-foreground)]">
          {t("generation.uploadReferenceHint")}
        </div>
      )}

      {reference ? (
        <p className="text-xs text-[var(--muted)]">
          {t("generation.referenceAnalysisStatus")}:{" "}
          <span className="font-medium text-[var(--foreground)]">{reference.analysisStatus}</span>
          {reference.errorMessage ? ` · ${reference.errorMessage}` : ""}
        </p>
      ) : null}
    </div>
  );
}
