"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { RecreationControls } from "@/components/generation/recreation-controls";
import { ReferenceUploader } from "@/components/generation/reference-uploader";
import { ReferenceAnalysisPanel } from "@/components/generation/reference-analysis-panel";
import { SelectedIdentityImages } from "@/components/generation/selected-identity-images";
import { VariantGallery } from "@/components/generation/variant-gallery";
import { SectionHeader } from "@/components/dashboard/section-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type {
  GenerationBundle,
  IdentityProfile,
  IdentityPackSummary,
  IdentityPackWorkspaceData,
  ReferenceImage,
  UserSettings,
} from "@/types/domain";

function referenceBlockingReason(reference: ReferenceImage | null) {
  if (!reference) return "upload";
  if (reference.analysisStatus !== "completed") return "analyze";
  if (!reference.analysisJson?.singlePersonClear || !reference.analysisJson?.primaryFaceVisible) return "single";
  if (reference.analysisJson.subjectCount !== 1) return "one";
  if (reference.analysisJson.referenceQuality === "low") return "quality";
  return null;
}

function profileBlockingReason(profile: IdentityProfile | null) {
  if (!profile) return "missing";
  if (profile.status !== "completed") return profile.errorMessage ?? "inconsistent";
  if (profile.validImageCount < profile.minRequiredImages) {
    return `min:${profile.minRequiredImages}:${profile.validImageCount}`;
  }
  return null;
}

function deriveGenerationProgress(params: {
  bundle: GenerationBundle | null;
  generationStatus: string | null;
  t: (key: string) => string;
}) {
  if (!params.generationStatus) return null;

  const generationJob = params.bundle?.jobs
    .filter((job) => job.type === "generate_recreation")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

  const payload =
    generationJob?.resultJson && typeof generationJob.resultJson === "object"
      ? (generationJob.resultJson as Record<string, unknown>)
      : null;
  const rawProgress = payload?.progressPercent;
  const progressFromJob = typeof rawProgress === "number" && Number.isFinite(rawProgress) ? rawProgress : null;
  const stageFromJob = typeof payload?.stage === "string" ? payload.stage : null;

  if (params.generationStatus === "queued") {
    return { value: progressFromJob ?? 8, label: stageFromJob ?? params.t("generation.progressQueued") };
  }
  if (params.generationStatus === "processing") {
    return { value: progressFromJob ?? 45, label: stageFromJob ?? params.t("generation.progressRunning") };
  }
  if (params.generationStatus === "completed") {
    return { value: 100, label: params.t("generation.progressCompleted") };
  }
  return { value: progressFromJob ?? 100, label: stageFromJob ?? params.t("generation.progressFailed") };
}

function toHumanBlockingReason(code: string | null, t: (key: string, params?: Record<string, string | number>) => string) {
  if (!code) return null;
  if (code === "missing") return t("identity.profileNotReady");
  if (code === "inconsistent") return t("identity.profileNotReady");
  if (code.startsWith("min:")) {
    const [, required, valid] = code.split(":");
    return t("identity.profileSummary", { status: "incomplete", valid: Number(valid), required: Number(required) });
  }
  if (code === "upload") return t("generation.uploadReferenceHint");
  if (code === "analyze") return t("generation.uploadReferenceForAnalysis");
  if (code === "single" || code === "one") return t("generation.uploadReferenceForAnalysis");
  if (code === "quality") return t("generation.uploadReferenceForAnalysis");
  return code;
}

export function NewRecreationWorkspace({
  initialPacks,
  initialSelectedPackId,
  initialPackData,
  initialReference,
  settings,
}: {
  initialPacks: IdentityPackSummary[];
  initialSelectedPackId: string | null;
  initialPackData: IdentityPackWorkspaceData["packData"];
  initialReference: ReferenceImage | null;
  settings: UserSettings;
}) {
  const { t } = useAppPreferences();
  const searchParams = useSearchParams();
  const highlightDefaults = searchParams.get("panel") === "defaults";

  const [reference, setReference] = useState<ReferenceImage | null>(initialReference);
  const [referenceFidelity, setReferenceFidelity] = useState(settings.defaultFidelity);
  const [identityStrength, setIdentityStrength] = useState(settings.defaultIdentityStrength);
  const [defaultFidelity, setDefaultFidelity] = useState(settings.defaultFidelity);
  const [defaultIdentityStrength, setDefaultIdentityStrength] = useState(settings.defaultIdentityStrength);
  const [defaultWatermark, setDefaultWatermark] = useState(settings.watermarkEnabled);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [uploadingReference, setUploadingReference] = useState(false);
  const [referencePreviewUrl, setReferencePreviewUrl] = useState<string | null>(null);
  const [bundle, setBundle] = useState<GenerationBundle | null>(null);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null);
  const [autoScrolledGenerationId, setAutoScrolledGenerationId] = useState<string | null>(null);
  const [packs, setPacks] = useState<IdentityPackSummary[]>(initialPacks);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(initialSelectedPackId);
  const [packData, setPackData] = useState<IdentityPackWorkspaceData["packData"]>(initialPackData);

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const defaultsRef = useRef<HTMLDivElement | null>(null);

  const pack = packData?.pack ?? null;
  const packProfile = packData?.profile ?? null;
  const packImages = useMemo(() => packData?.images ?? [], [packData]);

  useEffect(() => {
    if (highlightDefaults) {
      setTimeout(() => defaultsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    }
  }, [highlightDefaults]);

  const refreshWorkspace = async (packId?: string | null) => {
    const query = packId ? `?packId=${encodeURIComponent(packId)}` : "";
    const response = await fetch(`/api/identity-packs${query}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message ?? t("identity.workspaceLoadError"));
    }

    const workspace = payload.data as IdentityPackWorkspaceData;
    setPacks(workspace.packs);
    setSelectedPackId(workspace.selectedPackId);
    setPackData(workspace.packData);
  };

  useEffect(() => {
    let cancelled = false;

    const loadLatestGeneration = async () => {
      const response = await fetch("/api/generations");
      const payload = await response.json();
      if (!response.ok || cancelled) return;

      const bundles = (payload.data?.bundles as GenerationBundle[] | undefined) ?? [];
      if (!bundles.length) return;

      const latest = bundles[0];
      if (!latest) return;

      setBundle(latest);
      setGenerationStatus(latest.generation.status);
      setGenerationError(latest.generation.status === "failed" ? latest.generation.errorMessage : null);
      if (latest.generation.status === "queued" || latest.generation.status === "processing") {
        setActiveGenerationId(latest.generation.id);
      }
    };

    loadLatestGeneration().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const selectableImages = useMemo(
    () =>
      [...packImages].sort((a, b) => {
        const aValid = a.isIdentityValid ? 1 : 0;
        const bValid = b.isIdentityValid ? 1 : 0;
        if (aValid !== bValid) return bValid - aValid;
        const aConsistency = a.identityConsistencyScore ?? 0;
        const bConsistency = b.identityConsistencyScore ?? 0;
        if (aConsistency !== bConsistency) return bConsistency - aConsistency;
        return (b.score ?? 0) - (a.score ?? 0);
      }),
    [packImages],
  );

  const [selectedImageIds, setSelectedImageIds] = useState<string[]>(() =>
    selectableImages.filter((image) => image.isIdentityValid).slice(0, 6).map((image) => image.id),
  );

  useEffect(() => {
    setSelectedImageIds((current) => {
      const available = new Set(selectableImages.map((image) => image.id));
      const kept = current.filter((id) => available.has(id));
      if (kept.length) return kept;
      return selectableImages.filter((image) => image.isIdentityValid).slice(0, 6).map((image) => image.id);
    });
  }, [selectableImages]);

  useEffect(() => {
    return () => {
      if (referencePreviewUrl) URL.revokeObjectURL(referencePreviewUrl);
    };
  }, [referencePreviewUrl]);

  useEffect(() => {
    if (!reference || (reference.analysisStatus !== "pending" && reference.analysisStatus !== "running")) {
      return;
    }

    const interval = setInterval(async () => {
      const response = await fetch("/api/references", { method: "GET" });
      const payload = await response.json();
      if (!response.ok) return;
      const latest = payload.data?.reference as ReferenceImage | null;
      if (latest && latest.id === reference.id) {
        setReference(latest);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [reference]);

  useEffect(() => {
    if (!activeGenerationId) return;
    const interval = setInterval(async () => {
      const response = await fetch(`/api/generations/${activeGenerationId}`);
      const payload = await response.json();
      if (!response.ok) return;

      const nextBundle = payload.data?.bundle as GenerationBundle;
      setBundle(nextBundle);
      setGenerationStatus(nextBundle.generation.status);

      const latestJobError = nextBundle.jobs.find((job) => job.status === "failed")?.errorMessage ?? null;
      const showFinalError = nextBundle.generation.status === "failed";
      setGenerationError(showFinalError ? nextBundle.generation.errorMessage ?? latestJobError : null);

      if (nextBundle.generation.status === "completed" || nextBundle.generation.status === "failed") {
        if (nextBundle.generation.status === "completed" && autoScrolledGenerationId !== nextBundle.generation.id) {
          setAutoScrolledGenerationId(nextBundle.generation.id);
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 140);
        }
        setActiveGenerationId(null);
        clearInterval(interval);
      }
    }, 3500);
    return () => clearInterval(interval);
  }, [activeGenerationId, autoScrolledGenerationId]);

  const handleSelectPack = async (packId: string) => {
    setSelectedPackId(packId);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("packId", packId);
      window.history.replaceState({}, "", url.toString());
    }
    try {
      await refreshWorkspace(packId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("identity.workspaceLoadError"));
    }
  };

  const handleReferencePick = async (file: File | null) => {
    if (!file) return;
    const nextPreviewUrl = URL.createObjectURL(file);
    setReferencePreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return nextPreviewUrl;
    });
    setUploadingReference(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/references", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("generation.uploadReferenceHint"));
      }

      setReference(payload.data.reference);
      setReferencePreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      toast.success(t("generation.uploadReferenceHint"));
    } catch (error) {
      setReferencePreviewUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      toast.error(error instanceof Error ? error.message : t("generation.uploadReferenceHint"));
    } finally {
      setUploadingReference(false);
    }
  };

  const handleToggleSelectedImage = (imageId: string) => {
    const image = selectableImages.find((item) => item.id === imageId);
    if (image && !image.isIdentityValid) {
      toast.error(image.identityDecisionReason ?? t("generation.notSuitable"));
      return;
    }

    setSelectedImageIds((current) => {
      if (current.includes(imageId)) {
        if (current.length <= 1) return current;
        return current.filter((id) => id !== imageId);
      }
      if (current.length >= 8) return current;
      return [...current, imageId];
    });
  };

  const handleSaveDefaults = async () => {
    setSavingDefaults(true);
    try {
      const response = await fetch("/api/user-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultFidelity,
          defaultIdentityStrength,
          watermarkEnabled: defaultWatermark,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("generation.defaultsSaveError"));
      }
      toast.success(t("generation.defaultsSaved"));
      setReferenceFidelity(defaultFidelity);
      setIdentityStrength(defaultIdentityStrength);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("generation.defaultsSaveError"));
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleGenerate = async () => {
    if (!pack) {
      toast.error(t("generation.noPackAvailable"));
      return;
    }
    const packIssue = profileBlockingReason(packProfile);
    if (packIssue) {
      toast.error(toHumanBlockingReason(packIssue, t) ?? packIssue);
      return;
    }
    const referenceIssue = referenceBlockingReason(reference);
    if (referenceIssue) {
      toast.error(toHumanBlockingReason(referenceIssue, t) ?? referenceIssue);
      return;
    }
    if (!selectedImageIds.length) {
      toast.error(t("generation.selectedTitle"));
      return;
    }

    setCreatingJob(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          referenceImageId: reference?.id,
          referenceFidelity,
          identityStrength,
          selectedIdentityImageIds: selectedImageIds,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("generation.generateVariants"));
      }

      setActiveGenerationId(payload.data.generationId);
      setGenerationStatus(payload.data.status);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("generation.progressFailed");
      setGenerationError(message);
      toast.error(message);
    } finally {
      setCreatingJob(false);
    }
  };

  const packIssue = profileBlockingReason(packProfile);
  const referenceIssue = referenceBlockingReason(reference);
  const progress = useMemo(
    () =>
      deriveGenerationProgress({
        bundle,
        generationStatus,
        t,
      }),
    [bundle, generationStatus, t],
  );

  const canGenerate = Boolean(
    pack && !packIssue && !referenceIssue && selectedImageIds.length >= (packProfile?.minRequiredImages ?? 1),
  );

  return (
    <div className="space-y-8">
      <SectionHeader title={t("generation.sectionTitle")} description={t("generation.sectionDescription")} />

      <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 text-sm text-[var(--muted-foreground)] md:grid-cols-3">
        <p>{t("generation.guidance1")}</p>
        <p>{t("generation.guidance2")}</p>
        <p>{t("generation.guidance3")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReferenceUploader
          reference={reference}
          previewUrl={referencePreviewUrl}
          uploading={uploadingReference}
          onPick={handleReferencePick}
        />
        <RecreationControls
          packs={packs}
          selectedPackId={selectedPackId}
          pack={pack}
          packProfile={packProfile}
          referenceFidelity={referenceFidelity}
          identityStrength={identityStrength}
          creating={creatingJob}
          canGenerate={canGenerate}
          generationStatus={generationStatus}
          generationError={generationError}
          blockingReason={toHumanBlockingReason(packIssue ?? referenceIssue, t)}
          onSelectPack={handleSelectPack}
          onReferenceFidelity={setReferenceFidelity}
          onIdentityStrength={setIdentityStrength}
          onGenerate={handleGenerate}
        />
      </div>

      <div ref={defaultsRef}>
        <Card
          className={
            highlightDefaults ? "ring-2 ring-[var(--focus-ring)] ring-offset-2 ring-offset-[var(--background)]" : ""
          }
        >
          <CardHeader>
            <CardTitle>{t("generation.defaultsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-[var(--muted-foreground)]">{t("generation.defaultsDescription")}</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <Label>{t("generation.referenceFidelity")}</Label>
                <span className="font-mono text-[var(--muted-foreground)]">{defaultFidelity}</span>
              </div>
              <Slider value={[defaultFidelity]} onValueChange={(v) => setDefaultFidelity(v[0] ?? 0)} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <Label>{t("generation.identityStrength")}</Label>
                <span className="font-mono text-[var(--muted-foreground)]">{defaultIdentityStrength}</span>
              </div>
              <Slider
                value={[defaultIdentityStrength]}
                onValueChange={(v) => setDefaultIdentityStrength(v[0] ?? 0)}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2">
              <div>
                <p className="text-sm text-[var(--foreground)]">{t("generation.watermarkEnabled")}</p>
                <p className="text-xs text-[var(--muted)]">{t("generation.watermarkHint")}</p>
              </div>
              <Switch checked={defaultWatermark} onCheckedChange={setDefaultWatermark} />
            </div>
            <Button onClick={handleSaveDefaults} disabled={savingDefaults}>
              {savingDefaults ? t("common.loading") : t("common.save")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {progress ? (
        <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-4 shadow-[0_16px_60px_-34px_rgba(15,23,42,0.35)] backdrop-blur-[20px]">
          <div className="flex items-center justify-between text-xs text-[var(--muted)]">
            <p className="font-medium text-[var(--foreground)]">{t("generation.progressTitle")}</p>
            <p className="font-mono">{Math.round(progress.value)}%</p>
          </div>
          <Progress value={progress.value} className="h-2.5" />
          <p className="text-xs text-[var(--muted)]">{progress.label}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <ReferenceAnalysisPanel analysis={reference?.analysisJson ?? null} />
        <SelectedIdentityImages
          images={selectableImages}
          selectedIds={selectedImageIds}
          onToggle={handleToggleSelectedImage}
        />
      </div>

      <div ref={resultsRef}>
        {bundle && bundle.variants.length ? (
          <VariantGallery generationId={bundle.generation.id} variants={bundle.variants} />
        ) : (
          <EmptyState title={t("generation.noResultsYetTitle")} description={t("generation.noResultsYetDescription")} />
        )}
      </div>
    </div>
  );
}
