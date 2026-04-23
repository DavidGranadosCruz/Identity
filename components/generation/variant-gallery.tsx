/* eslint-disable @next/next/no-img-element */
"use client";

import type { GenerationVariant } from "@/types/domain";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";

function buildDownloadUrl(generationId: string, variantId: string, format: "jpg" | "png" | "bmp") {
  return `/api/generations/${generationId}/variants/${variantId}/download?format=${format}`;
}

function labelForVariant(variantType: GenerationVariant["variantType"]) {
  if (variantType === "faithful") return "Faithful";
  if (variantType === "editorial") return "Editorial";
  return "Cinematic";
}

export function VariantGallery({ generationId, variants }: { generationId: string; variants: GenerationVariant[] }) {
  const { t } = useAppPreferences();
  const defaultTab = variants[0]?.id;

  if (!defaultTab) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-[var(--muted-foreground)]">
          {t("generation.noResultsYetDescription")}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("generation.resultsTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {variants.map((variant) => (
              <TabsTrigger key={variant.id} value={variant.id}>
                {labelForVariant(variant.variantType)}
              </TabsTrigger>
            ))}
          </TabsList>

          {variants.map((variant) => (
            <TabsContent key={variant.id} value={variant.id}>
              <div className="space-y-3">
                <img
                  src={variant.imageUrl}
                  alt={variant.variantType}
                  className="max-h-[620px] w-full rounded-xl border border-[var(--border)] object-contain bg-[var(--surface-muted)]"
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant={variant.accepted ? "success" : "warning"}>
                    {variant.accepted ? t("generation.accepted") : t("generation.rejected")}
                  </Badge>
                  <Badge variant="default">
                    {t("generation.identityScore")} {variant.identitySimilarityScore ?? 0}
                  </Badge>
                  <Badge variant="default">
                    {t("generation.compositionScore")} {variant.referenceCompositionScore ?? 0}
                  </Badge>
                  <Badge variant="default">
                    {t("generation.backgroundScore")} {variant.backgroundPreservationScore ?? 0}
                  </Badge>
                  <Badge variant="default">
                    {t("generation.poseScore")} {variant.poseMatchScore ?? 0}
                  </Badge>
                  <Badge variant="accent">
                    {t("generation.overallScore")} {variant.overallAcceptanceScore ?? 0}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={buildDownloadUrl(generationId, variant.id, "jpg")}>{t("generation.saveJpg")}</a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href={buildDownloadUrl(generationId, variant.id, "png")}>{t("generation.savePng")}</a>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <a href={buildDownloadUrl(generationId, variant.id, "bmp")}>{t("generation.saveBmp")}</a>
                  </Button>
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
