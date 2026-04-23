/* eslint-disable @next/next/no-img-element */
"use client";

import { RefreshCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatScore } from "@/lib/utils/cn";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { IdentityPackImage } from "@/types/domain";

function statusLabel(status: IdentityPackImage["analysisStatus"]) {
  if (status === "pending") return "pending";
  if (status === "running") return "running";
  if (status === "completed") return "completed";
  return "failed";
}

export function IdentityImageGrid({
  images,
  onDelete,
  onReanalyze,
  deletingImageId,
}: {
  images: IdentityPackImage[];
  deletingImageId: string | null;
  onDelete: (imageId: string) => void;
  onReanalyze: (imageId: string) => void;
}) {
  const { t } = useAppPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("identity.analysisResults")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => {
            const warnings = image.analysisJson?.multimodal
              ? [
                  image.analysisJson.multimodal.cutoutOrRenderDetected ? t("identity.cutoutOrRender") : null,
                  image.analysisJson.multimodal.watermarkDetected ? t("identity.watermark") : null,
                  image.analysisJson.multimodal.blurLevel === "high" ? t("identity.highBlur") : null,
                  image.analysisJson.multimodal.multiplePeople || image.analysisJson.multimodal.faceCount !== 1
                    ? t("identity.multiplePeople")
                    : null,
                  !image.analysisJson.multimodal.faceVisible ? t("identity.faceNotVisible") : null,
                ].filter(Boolean)
              : [];

            return (
              <article
                key={image.id}
                className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]/82 shadow-[0_14px_34px_-24px_rgba(15,23,42,0.45)] backdrop-blur"
              >
                {image.imageUrl ? (
                  <img src={image.imageUrl} alt={image.originalFilename} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
                    {t("identity.noPreview")}
                  </div>
                )}

                <div className="space-y-3 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-[var(--muted)]">{image.originalFilename}</p>
                    <Badge
                      variant={
                        image.analysisStatus === "completed"
                          ? "success"
                          : image.analysisStatus === "failed"
                            ? "warning"
                            : "accent"
                      }
                    >
                      {t(`identity.${statusLabel(image.analysisStatus)}`)}
                    </Badge>
                  </div>

                  {image.analysisStatus === "completed" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-[var(--foreground)]">{formatScore(image.score ?? 0)}</p>
                        <Badge variant={image.keepRecommendation === "keep" ? "success" : "warning"}>
                          {image.keepRecommendation === "keep" ? t("identity.keep") : t("identity.replace")}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        <Badge variant={image.isIdentityValid ? "success" : "warning"}>
                          {image.isIdentityValid ? t("identity.validForIdentity") : t("identity.invalidForIdentity")}
                        </Badge>
                        <Badge variant="default">
                          {t("identity.consistency")} {image.identityConsistencyScore ?? 0}
                        </Badge>
                      </div>

                      <p className="text-xs text-[var(--muted-foreground)]">
                        {image.identityDecisionReason ??
                          image.analysisJson?.reasons?.join(" · ") ??
                          t("identity.noAnalysisDetails")}
                      </p>

                      {warnings.length ? (
                        <p className="text-xs text-[var(--warning)]">
                          {t("identity.warningPrefix")}: {warnings.join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {image.analysisStatus === "failed" ? (
                    <p className="text-xs text-[var(--danger)]">{image.errorMessage ?? t("identity.analysisFailed")}</p>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => onReanalyze(image.id)}
                      disabled={image.analysisStatus === "running"}
                    >
                      <RefreshCcw className="size-3.5" />
                      {t("identity.reanalyze")}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(image.id)}
                      disabled={deletingImageId === image.id}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
