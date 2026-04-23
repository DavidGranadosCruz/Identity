"use client";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { IdentityPack, IdentityPackSummary, IdentityProfile } from "@/types/domain";

function statusVariant(status: IdentityPackSummary["statusLabel"]) {
  if (status === "ready") return "success" as const;
  if (status === "blocked") return "warning" as const;
  return "accent" as const;
}

export function RecreationControls({
  packs,
  selectedPackId,
  pack,
  packProfile,
  referenceFidelity,
  identityStrength,
  creating,
  canGenerate,
  generationStatus,
  generationError,
  blockingReason,
  onSelectPack,
  onReferenceFidelity,
  onIdentityStrength,
  onGenerate,
}: {
  packs: IdentityPackSummary[];
  selectedPackId: string | null;
  pack: IdentityPack | null;
  packProfile: IdentityProfile | null;
  referenceFidelity: number;
  identityStrength: number;
  creating: boolean;
  canGenerate: boolean;
  generationStatus: string | null;
  generationError: string | null;
  blockingReason: string | null;
  onSelectPack: (packId: string) => void;
  onReferenceFidelity: (value: number) => void;
  onIdentityStrength: (value: number) => void;
  onGenerate: () => void;
}) {
  const { t } = useAppPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("generation.recreationSettings")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
          {t("generation.recreationInfo")}
        </div>

        <div className="space-y-2">
          <Label>{t("generation.selectPackForGeneration")}</Label>
          {packs.length ? (
            <div className="grid gap-2">
              {packs.map((item) => {
                const isSelected = item.pack.id === selectedPackId;
                const isBlocked = !item.readyForGeneration;
                return (
                  <button
                    key={item.pack.id}
                    type="button"
                    onClick={() => onSelectPack(item.pack.id)}
                    disabled={isBlocked && !isSelected}
                    className={`rounded-xl border px-3 py-2 text-left transition ${
                      isSelected
                        ? "border-[var(--focus-ring)] bg-[var(--surface)]"
                        : "border-[var(--border)] bg-[var(--surface)]/75 hover:border-[var(--focus-ring)]/45"
                    } ${isBlocked && !isSelected ? "cursor-not-allowed opacity-65" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-[var(--foreground)]">{item.pack.name}</p>
                      <Badge variant={statusVariant(item.statusLabel)}>
                        {t(`identity.packStatus${item.statusLabel.charAt(0).toUpperCase()}${item.statusLabel.slice(1)}`)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {t("identity.packCardValid", {
                        valid: item.validImageCount,
                        required: item.minRequiredImages,
                      })}
                    </p>
                    {isBlocked ? (
                      <p className="mt-1 text-xs text-[var(--warning)]">
                        {t(`identity.packReason${item.statusReason
                          .split("_")
                          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                          .join("")}`)}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)]">
              {t("generation.noPackAvailable")}
            </div>
          )}

          {packProfile ? (
            <p className="text-xs text-[var(--muted)]">
              {t("generation.profileLabel")}: {packProfile.status} - {t("generation.validLabel")}{" "}
              {packProfile.validImageCount}/{packProfile.minRequiredImages} - {t("generation.consistencyLabel")}{" "}
              {packProfile.consistencyScore ?? "-"}
            </p>
          ) : (
            <p className="text-xs text-[var(--warning)]">{t("generation.profileNotReady")}</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <Label>{t("generation.referenceFidelity")}</Label>
            <span className="font-mono text-[var(--muted-foreground)]">{referenceFidelity}</span>
          </div>
          <Slider value={[referenceFidelity]} onValueChange={(next) => onReferenceFidelity(next[0] ?? 0)} />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <Label>{t("generation.identityStrength")}</Label>
            <span className="font-mono text-[var(--muted-foreground)]">{identityStrength}</span>
          </div>
          <Slider value={[identityStrength]} onValueChange={(next) => onIdentityStrength(next[0] ?? 0)} />
        </div>

        <Button disabled={creating || !canGenerate || !pack} className="w-full" onClick={onGenerate}>
          {creating ? t("generation.creatingJob") : t("generation.generateVariants")}
        </Button>

        {blockingReason ? (
          <p className="text-xs text-[var(--warning)]">
            {t("generation.blockedPrefix")}: {blockingReason}
          </p>
        ) : null}
        {generationStatus ? (
          <p className="text-xs text-[var(--muted)]">
            {t("generation.currentStatus")}: {generationStatus}
          </p>
        ) : null}
        {generationError ? <p className="text-xs text-[var(--danger)]">{generationError}</p> : null}
      </CardContent>
    </Card>
  );
}
