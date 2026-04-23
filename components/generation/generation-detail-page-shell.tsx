/* eslint-disable @next/next/no-img-element */
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/dashboard/section-header";
import { BeforeAfterCompare } from "@/components/generation/before-after-compare";
import { GenerationLogsTimeline } from "@/components/generation/generation-logs-timeline";
import { GenerationMetadata } from "@/components/generation/generation-metadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { GenerationBundle } from "@/types/domain";

function labelForVariant(type: string, t: (key: string) => string) {
  if (type === "faithful") return t("generation.variantFaithful");
  if (type === "editorial") return t("generation.variantEditorial");
  return t("generation.variantCinematic");
}

export function GenerationDetailPageShell({ bundle }: { bundle: GenerationBundle }) {
  const { t } = useAppPreferences();
  const defaultVariant = bundle.variants[0];
  const generationTitle =
    bundle.generation.title?.trim() || `${t("history.generatedLabel")} ${bundle.generation.id.slice(0, 8)}`;

  return (
    <div className="space-y-8">
      <SectionHeader title={generationTitle} description={t("generation.detailDescription")} />

      <div className="flex flex-wrap gap-2">
        <Badge variant="accent">{bundle.generation.status}</Badge>
        <Badge variant="default">{t("generation.variantsCount", { count: bundle.variants.length })}</Badge>
        {bundle.identityProfile ? (
          <Badge variant={bundle.identityProfile.status === "completed" ? "success" : "warning"}>
            {t("generation.profileBadge")}: {bundle.identityProfile.status}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("generation.referenceAnalysisTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-80 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--muted-foreground)]">
              {JSON.stringify(bundle.reference.analysisJson ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("generation.selectedImagesTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {bundle.selectedIdentityImages.map((image) => (
                <article
                  key={image.id}
                  className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]/88 p-2"
                >
                  <img
                    src={image.imageUrl}
                    alt={image.originalFilename}
                    className="aspect-square w-full rounded-xl border border-[var(--border)] object-cover"
                  />
                  <div className="flex flex-wrap gap-1 text-xs">
                    <Badge variant={image.isIdentityValid ? "success" : "warning"}>
                      {image.isIdentityValid ? t("generation.suitableBadge") : t("generation.unsuitableBadge")}
                    </Badge>
                    <Badge variant="default">
                      {t("generation.scoreQ")} {image.score ?? 0}
                    </Badge>
                    <Badge variant="default">
                      {t("generation.scoreI")} {image.identityConsistencyScore ?? 0}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-[11px] text-[var(--muted)]">
                    {image.identityDecisionReason ?? t("generation.noReason")}
                  </p>
                </article>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {defaultVariant ? (
        <Tabs defaultValue={defaultVariant.id}>
          <TabsList>
            {bundle.variants.map((variant) => (
              <TabsTrigger key={variant.id} value={variant.id}>
                {labelForVariant(variant.variantType, t)}
              </TabsTrigger>
            ))}
          </TabsList>

          {bundle.variants.map((variant) => (
            <TabsContent key={variant.id} value={variant.id}>
              <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
                <BeforeAfterCompare before={bundle.reference.imageUrl} after={variant.imageUrl} />
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("generation.variantValidationTitle")}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-[var(--muted-foreground)]">
                      <p>
                        {t("generation.identityScore")}: {variant.identitySimilarityScore ?? 0}
                      </p>
                      <p>
                        {t("generation.compositionScore")}: {variant.referenceCompositionScore ?? 0}
                      </p>
                      <p>
                        {t("generation.backgroundScore")}: {variant.backgroundPreservationScore ?? 0}
                      </p>
                      <p>
                        {t("generation.poseScore")}: {variant.poseMatchScore ?? 0}
                      </p>
                      <p>
                        {t("generation.overallScore")}: {variant.overallAcceptanceScore ?? 0}
                      </p>
                      <p>
                        {t("generation.statusPrefix")}:{" "}
                        <span className={variant.accepted ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                          {variant.accepted ? t("generation.accepted") : t("generation.rejected")}
                        </span>
                      </p>
                      {variant.rejectionReason ? (
                        <p className="text-xs text-[var(--danger)]">{variant.rejectionReason}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                  <GenerationMetadata variant={variant} />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Button asChild variant="outline">
                      <a href={`/api/generations/${bundle.generation.id}/variants/${variant.id}/download?format=jpg`}>
                        {t("generation.saveJpg")}
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href={`/api/generations/${bundle.generation.id}/variants/${variant.id}/download?format=png`}>
                        {t("generation.savePng")}
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href={`/api/generations/${bundle.generation.id}/variants/${variant.id}/download?format=bmp`}>
                        {t("generation.saveBmp")}
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : null}

      <GenerationLogsTimeline jobs={bundle.jobs} />
    </div>
  );
}
