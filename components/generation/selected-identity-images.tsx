/* eslint-disable @next/next/no-img-element */
"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { IdentityPackImage } from "@/types/domain";

function warningList(image: IdentityPackImage, t: (key: string) => string) {
  const multimodal = image.analysisJson?.multimodal;
  if (!multimodal) return [] as string[];

  const warnings: string[] = [];
  if (multimodal.cutoutOrRenderDetected) warnings.push(t("identity.cutoutOrRender"));
  if (multimodal.watermarkDetected) warnings.push(t("identity.watermark"));
  if (multimodal.blurLevel === "high") warnings.push(t("identity.highBlur"));
  if (multimodal.multiplePeople || multimodal.faceCount !== 1) warnings.push(t("identity.multiplePeople"));
  if (!multimodal.faceVisible) warnings.push(t("identity.faceNotVisible"));
  return warnings;
}

export function SelectedIdentityImages({
  images,
  selectedIds,
  onToggle,
}: {
  images: IdentityPackImage[];
  selectedIds: string[];
  onToggle: (imageId: string) => void;
}) {
  const { t } = useAppPreferences();

  const selectionReason = (image: IdentityPackImage, selected: boolean) => {
    if (selected) {
      return t("generation.selectedReason", {
        consistency: image.identityConsistencyScore ?? 0,
        quality: image.score ?? 0,
      });
    }
    return image.identityDecisionReason ?? t("generation.notSelectedReason");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("generation.selectedTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {images.length ? (
          <div className="grid gap-3 md:grid-cols-4">
            {images.map((image) => {
              const selected = selectedIds.includes(image.id);
              const canUse = image.isIdentityValid === true;
              const warnings = warningList(image, t);

              return (
                <button
                  key={image.id}
                  type="button"
                  className={`space-y-2 rounded-xl border p-2 text-left transition-colors ${
                    selected
                      ? "border-[var(--primary)] bg-[var(--surface)]"
                      : canUse
                        ? "border-[var(--border)] bg-[var(--surface)]/84 hover:bg-[var(--surface-muted)]"
                        : "border-[var(--warning)]/40 bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface))]"
                  }`}
                  onClick={() => onToggle(image.id)}
                >
                  {image.imageUrl ? (
                    <img src={image.imageUrl} alt={image.originalFilename} className="aspect-square w-full rounded-lg object-cover" />
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-lg bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
                      {t("identity.noPreview")}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant={canUse ? (selected ? "accent" : "success") : "warning"}>
                        {canUse ? (selected ? t("generation.selected") : t("generation.suitable")) : t("generation.notSuitable")}
                      </Badge>
                      <Badge variant="default">
                        {t("generation.qualityShort")} {image.score ?? 0}
                      </Badge>
                      <Badge variant="default">
                        {t("generation.identityShort")} {image.identityConsistencyScore ?? 0}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-[var(--muted)]">{image.originalFilename}</p>
                    <p className="text-[11px] text-[var(--muted-foreground)]">{selectionReason(image, selected)}</p>
                    {warnings.length ? (
                      <p className="text-[11px] text-[var(--warning)]">
                        {t("identity.warningPrefix")}: {warnings.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">{t("generation.noIdentityImagesAvailable")}</p>
        )}
      </CardContent>
    </Card>
  );
}
