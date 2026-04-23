"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SectionHeader } from "@/components/dashboard/section-header";
import { IdentityPackUploader } from "@/components/identity/identity-pack-uploader";
import { IdentityImageGrid } from "@/components/identity/identity-image-grid";
import { IdentityQualityGuidelines } from "@/components/identity/quality-guidelines";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { appConfig } from "@/lib/utils/config";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { IdentityPackImage, IdentityPackSummary, IdentityPackWorkspaceData } from "@/types/domain";

interface IdentityPackPageClientProps {
  initialPacks: IdentityPackSummary[];
  initialSelectedPackId: string | null;
  initialPackData: IdentityPackWorkspaceData["packData"];
}

function estimateElapsedMs(image: IdentityPackImage) {
  const createdAtMs = new Date(image.createdAt).getTime();
  const updatedAtMs = new Date(image.updatedAt).getTime();
  if (!Number.isFinite(createdAtMs) || !Number.isFinite(updatedAtMs)) return null;

  if (image.analysisStatus === "running" || image.analysisStatus === "pending") {
    return Math.max(0, Date.now() - createdAtMs);
  }
  return Math.max(0, updatedAtMs - createdAtMs);
}

function buildUploadBatches(files: File[], maxBatchBytes = 24 * 1024 * 1024, maxBatchItems = 6) {
  const batches: File[][] = [];
  let currentBatch: File[] = [];
  let currentBytes = 0;

  for (const file of files) {
    const wouldExceedBytes = currentBytes + file.size > maxBatchBytes;
    const wouldExceedItems = currentBatch.length >= maxBatchItems;
    if ((wouldExceedBytes || wouldExceedItems) && currentBatch.length) {
      batches.push(currentBatch);
      currentBatch = [];
      currentBytes = 0;
    }
    currentBatch.push(file);
    currentBytes += file.size;
  }
  if (currentBatch.length) {
    batches.push(currentBatch);
  }
  return batches;
}

function statusVariant(status: IdentityPackSummary["statusLabel"]) {
  if (status === "ready") return "success" as const;
  if (status === "blocked") return "warning" as const;
  return "accent" as const;
}

export function IdentityPackPageClient({
  initialPacks,
  initialSelectedPackId,
  initialPackData,
}: IdentityPackPageClientProps) {
  const { t } = useAppPreferences();
  const [packs, setPacks] = useState<IdentityPackSummary[]>(initialPacks);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(initialSelectedPackId);
  const [packData, setPackData] = useState<IdentityPackWorkspaceData["packData"]>(initialPackData);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameInput, setNameInput] = useState(initialPackData?.pack.name ?? "My Identity Pack");
  const [creatingPack, setCreatingPack] = useState(false);
  const [createName, setCreateName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [confirmDeletePack, setConfirmDeletePack] = useState(false);
  const [deletingPack, setDeletingPack] = useState(false);

  const pack = packData?.pack ?? null;
  const profile = packData?.profile ?? null;
  const images = useMemo(() => packData?.images ?? [], [packData]);

  useEffect(() => {
    setNameInput(pack?.name ?? "My Identity Pack");
    setConfirmDeletePack(false);
  }, [pack?.id, pack?.name]);

  const hasRunningAnalysis =
    images.some((image) => image.analysisStatus === "pending" || image.analysisStatus === "running") ||
    packs.some(
      (item) =>
        item.pack.status === "analyzing" || item.profile?.status === "pending" || item.profile?.status === "running",
    );

  const refreshWorkspace = useCallback(async (packId?: string | null) => {
    const query = packId ? `?packId=${encodeURIComponent(packId)}` : "";
    const response = await fetch(`/api/identity-packs${query}`, { method: "GET" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message ?? t("identity.workspaceLoadError"));
    }

    const workspace = payload.data as IdentityPackWorkspaceData;
    setPacks(workspace.packs);
    setSelectedPackId(workspace.selectedPackId);
    setPackData(workspace.packData);
  }, [t]);

  useEffect(() => {
    if (!hasRunningAnalysis) return;

    const interval = setInterval(() => {
      void refreshWorkspace(selectedPackId).catch(() => undefined);
    }, 3000);

    return () => clearInterval(interval);
  }, [hasRunningAnalysis, selectedPackId, refreshWorkspace]);

  const qualitySummary = useMemo(() => {
    if (!images.length) return { keep: 0, replace: 0 };
    return images.reduce(
      (acc, image) => {
        if (image.keepRecommendation === "keep") acc.keep += 1;
        if (image.keepRecommendation === "replace") acc.replace += 1;
        return acc;
      },
      { keep: 0, replace: 0 },
    );
  }, [images]);

  const processingFeed = useMemo(
    () =>
      [...images]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 8)
        .map((image) => ({
          label: image.originalFilename,
          status: image.analysisStatus,
          elapsedMs: estimateElapsedMs(image),
        })),
    [images],
  );

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

  const handleCreatePack = async () => {
    const trimmed = createName.trim();
    if (!trimmed) {
      toast.error(t("identity.createNameRequired"));
      return;
    }

    setCreatingPack(true);
    try {
      const response = await fetch("/api/identity-packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("identity.createError"));
      }

      const createdPackId = payload.data?.pack?.id as string | undefined;
      await refreshWorkspace(createdPackId ?? null);
      setCreateName("");
      setShowCreateForm(false);
      toast.success(t("identity.createSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("identity.createError"));
    } finally {
      setCreatingPack(false);
    }
  };

  const handleDeletePack = async () => {
    if (!pack) return;
    setDeletingPack(true);
    try {
      const response = await fetch(`/api/identity-packs/${pack.id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("identity.deletePackError"));
      }

      await refreshWorkspace(null);
      toast.success(t("identity.deletePackSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("identity.deletePackError"));
    } finally {
      setDeletingPack(false);
      setConfirmDeletePack(false);
    }
  };

  const handleFiles = async (files: File[]) => {
    if (!files.length) return;
    if (!selectedPackId) {
      toast.error(t("identity.selectPackToUpload"));
      return;
    }
    if (files.length + images.length > appConfig.maxIdentityImages) {
      toast.error(t("identity.maxImagesError", { max: appConfig.maxIdentityImages }));
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      const batches = buildUploadBatches(files);
      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index];
        const formData = new FormData();
        formData.append("name", nameInput || "My Identity Pack");
        formData.append("packId", selectedPackId);
        batch.forEach((file) => formData.append("files", file));

        const response = await fetch("/api/identity-packs", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error?.message ?? t("identity.uploadBatchError"));
        }

        const progressValue = Math.round(((index + 1) / batches.length) * 100);
        setProgress(progressValue);
      }

      toast.success(t("identity.uploadSuccess"));
      await refreshWorkspace(selectedPackId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("identity.uploadError"));
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 250);
    }
  };

  const handleRenamePack = async () => {
    if (!pack) return;
    setRenaming(true);
    try {
      const response = await fetch(`/api/identity-packs/${pack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameInput }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("identity.renameError"));
      }
      await refreshWorkspace(pack.id);
      toast.success(t("identity.renameSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("identity.renameError"));
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!pack) return;
    setDeletingImageId(imageId);
    try {
      const response = await fetch(`/api/identity-packs/${pack.id}/images/${imageId}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("identity.deleteError"));
      }
      toast.success(t("identity.deleteSuccess"));
      await refreshWorkspace(pack.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("identity.deleteError"));
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleReanalyze = async (imageId?: string) => {
    if (!pack) return;
    try {
      const response = await fetch(`/api/identity-packs/${pack.id}/images/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageIds: imageId ? [imageId] : undefined }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("identity.enqueueAnalysisError"));
      }
      toast.success(t("identity.enqueueAnalysisSuccess"));
      await refreshWorkspace(pack.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("identity.enqueueAnalysisError"));
    }
  };

  return (
    <div className="space-y-8">
      <SectionHeader title={t("identity.packsPageTitle")} description={t("identity.packsPageDescription")} />

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t("identity.packsListTitle")}</CardTitle>
          <Button type="button" onClick={() => setShowCreateForm((current) => !current)}>
            <Plus className="size-4" />
            {t("identity.createNewPack")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showCreateForm ? (
            <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 sm:flex-row">
              <Input
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
                placeholder={t("identity.newPackNamePlaceholder")}
              />
              <div className="flex items-center gap-2">
                <Button type="button" onClick={handleCreatePack} disabled={creatingPack}>
                  {creatingPack ? t("common.loading") : t("identity.createPackAction")}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : null}

          {packs.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {packs.map((item) => {
                const active = item.pack.id === selectedPackId;
                return (
                  <button
                    key={item.pack.id}
                    type="button"
                    onClick={() => void handleSelectPack(item.pack.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[var(--focus-ring)] bg-[var(--surface)] shadow-[0_20px_60px_-36px_rgba(2,8,23,0.45)]"
                        : "border-[var(--border)] bg-[var(--surface)]/82 hover:border-[var(--focus-ring)]/50 hover:bg-[var(--surface)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)]">{item.pack.name}</p>
                      <Badge variant={statusVariant(item.statusLabel)}>
                        {t(`identity.packStatus${item.statusLabel.charAt(0).toUpperCase()}${item.statusLabel.slice(1)}`)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {t("identity.packCardImages", { count: item.imageCount })}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {t("identity.packCardValid", {
                        valid: item.validImageCount,
                        required: item.minRequiredImages,
                      })}
                    </p>
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      {t(`identity.packReason${item.statusReason
                        .split("_")
                        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                        .join("")}`)}
                    </p>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState title={t("identity.noPacksTitle")} description={t("identity.noPacksDescription")} />
          )}
        </CardContent>
      </Card>

      {pack ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <IdentityPackUploader
              fileCount={images.length}
              uploading={uploading}
              progress={progress}
              processingFeed={processingFeed}
              onPickFiles={handleFiles}
            />
            <IdentityQualityGuidelines />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{pack.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input value={nameInput} onChange={(event) => setNameInput(event.target.value)} />
                <Button onClick={handleRenamePack} disabled={renaming}>
                  {renaming ? t("identity.saveLoading") : t("identity.renamePack")}
                </Button>
                <Button variant="outline" onClick={() => handleReanalyze()}>
                  {t("identity.reanalyzeAll")}
                </Button>
                <Button
                  type="button"
                  variant={confirmDeletePack ? "destructive" : "outline"}
                  onClick={() => {
                    if (!confirmDeletePack) {
                      setConfirmDeletePack(true);
                      return;
                    }
                    void handleDeletePack();
                  }}
                  disabled={deletingPack}
                >
                  <Trash2 className="size-4" />
                  {confirmDeletePack
                    ? deletingPack
                      ? t("common.loading")
                      : t("identity.confirmDeletePack")
                    : t("identity.deletePack")}
                </Button>
              </div>

              {confirmDeletePack ? (
                <p className="text-xs text-[var(--warning)]">{t("identity.deletePackConfirmDescription")}</p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  {t("identity.packImagesSummary", { count: images.length })}
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  {t("identity.keepReplaceSummary", {
                    keep: qualitySummary.keep,
                    replace: qualitySummary.replace,
                  })}
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  {t("identity.profileSummary", {
                    status: profile?.status ?? "pending",
                    valid: profile?.validImageCount ?? 0,
                    required: profile?.minRequiredImages ?? 4,
                  })}
                </div>
              </div>

              {profile?.errorMessage ? <p className="text-xs text-[var(--warning)]">{profile.errorMessage}</p> : null}
            </CardContent>
          </Card>

          {images.length ? (
            <IdentityImageGrid
              images={images}
              deletingImageId={deletingImageId}
              onDelete={handleDeleteImage}
              onReanalyze={handleReanalyze}
            />
          ) : (
            <EmptyState title={t("identity.emptySelectedTitle")} description={t("identity.emptySelectedDescription")} />
          )}
        </>
      ) : (
        <EmptyState title={t("identity.noPacksTitle")} description={t("identity.noPacksDescription")} />
      )}
    </div>
  );
}
