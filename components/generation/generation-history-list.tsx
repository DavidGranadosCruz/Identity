/* eslint-disable @next/next/no-img-element */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateLabel, formatMilliseconds } from "@/lib/utils/cn";
import { useAppPreferences } from "@/components/providers/app-preferences-provider";
import type { GenerationBundle } from "@/types/domain";

function resolveAfterImage(item: GenerationBundle) {
  const accepted = item.variants.find((variant) => variant.accepted);
  return accepted ?? item.variants[0] ?? null;
}

function resolveThumbnail(item: GenerationBundle) {
  const after = resolveAfterImage(item);
  return after?.imageUrl ?? item.reference.imageUrl;
}

function resolveProcessingTimeMs(item: GenerationBundle) {
  const generationJob = item.jobs
    .filter((job) => job.type === "generate_recreation")
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0];

  if (!generationJob) return null;
  const startedAt = new Date(generationJob.createdAt).getTime();
  if (!Number.isFinite(startedAt)) return null;
  const isDone = generationJob.status === "completed" || generationJob.status === "failed";
  const endedAt = isDone ? new Date(generationJob.updatedAt).getTime() : Date.now();
  if (!Number.isFinite(endedAt)) return null;
  return Math.max(0, endedAt - startedAt);
}

function defaultTitle(item: GenerationBundle, fallbackLabel: string) {
  return item.generation.title?.trim() || `${fallbackLabel} ${item.generation.id.slice(0, 8)}`;
}

export function GenerationHistoryList({ items }: { items: GenerationBundle[] }) {
  const { t, locale } = useAppPreferences();
  const [localItems, setLocalItems] = useState(items);
  const [previewGenerationId, setPreviewGenerationId] = useState<string | null>(null);
  const [confirmDeleteGenerationId, setConfirmDeleteGenerationId] = useState<string | null>(null);
  const [editingGenerationId, setEditingGenerationId] = useState<string | null>(null);
  const [nextTitle, setNextTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [deletingGenerationId, setDeletingGenerationId] = useState<string | null>(null);

  const generatedLabel = t("history.generatedLabel");
  const previewItem = useMemo(
    () => localItems.find((item) => item.generation.id === previewGenerationId) ?? null,
    [localItems, previewGenerationId],
  );
  const deleteCandidate = useMemo(
    () => localItems.find((item) => item.generation.id === confirmDeleteGenerationId) ?? null,
    [localItems, confirmDeleteGenerationId],
  );

  if (!localItems.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/70 p-8 text-center text-sm text-[var(--muted)]">
        {t("history.noSavedGenerations")}
      </div>
    );
  }

  const handleStartTitleEdit = (item: GenerationBundle) => {
    setEditingGenerationId(item.generation.id);
    setNextTitle(defaultTitle(item, generatedLabel));
  };

  const handleCancelTitleEdit = () => {
    setEditingGenerationId(null);
    setNextTitle("");
  };

  const handleSaveTitle = async (generationId: string) => {
    const trimmed = nextTitle.trim();
    if (!trimmed) {
      toast.error(t("history.titleEmptyError"));
      return;
    }

    setSavingTitle(true);
    try {
      const response = await fetch(`/api/generations/${generationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("history.titleUpdateError"));
      }

      setLocalItems((current) =>
        current.map((item) =>
          item.generation.id === generationId
            ? {
                ...item,
                generation: {
                  ...item.generation,
                  title: trimmed,
                },
              }
            : item,
        ),
      );
      setEditingGenerationId(null);
      setNextTitle("");
      toast.success(t("history.titleUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("history.titleUpdateError"));
    } finally {
      setSavingTitle(false);
    }
  };

  const executeDeleteGeneration = async (generationId: string) => {
    setDeletingGenerationId(generationId);
    try {
      const response = await fetch(`/api/generations/${generationId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error?.message ?? t("history.deleteError"));
      }
      setLocalItems((current) => current.filter((item) => item.generation.id !== generationId));
      if (previewGenerationId === generationId) setPreviewGenerationId(null);
      if (confirmDeleteGenerationId === generationId) setConfirmDeleteGenerationId(null);
      toast.success(t("history.deleteSuccess"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("history.deleteError"));
    } finally {
      setDeletingGenerationId(null);
    }
  };

  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {localItems.map((item) => {
          const generationId = item.generation.id;
          const thumbnailUrl = resolveThumbnail(item);
          const statusLabel =
            item.generation.status === "completed"
              ? t("history.success")
              : item.generation.status === "failed"
                ? t("history.failed")
                : t("history.processing");
          const processingMs = resolveProcessingTimeMs(item);
          const isEditing = editingGenerationId === generationId;
          const isDeleting = deletingGenerationId === generationId;

          return (
            <article
              key={generationId}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 shadow-[0_20px_70px_-34px_rgba(15,23,42,0.34)] backdrop-blur-[20px]"
            >
              <button
                type="button"
                onClick={() => setPreviewGenerationId(generationId)}
                className="group block w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] text-left"
              >
                <img
                  src={thumbnailUrl}
                  alt={`${generatedLabel} ${generationId}`}
                  className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
                />
              </button>

              <div className="space-y-2 px-1 pt-3">
                <div className="flex items-start justify-between gap-2">
                  {isEditing ? (
                    <div className="flex w-full items-center gap-2">
                      <Input
                        value={nextTitle}
                        onChange={(event) => setNextTitle(event.target.value)}
                        maxLength={120}
                        autoFocus
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleSaveTitle(generationId)}
                        disabled={savingTitle}
                      >
                        {t("common.save")}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={handleCancelTitleEdit}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="truncate text-sm font-semibold tracking-[-0.01em] text-[var(--foreground)]">
                        {defaultTitle(item, generatedLabel)}
                      </p>
                      <Badge
                        variant={
                          item.generation.status === "completed"
                            ? "success"
                            : item.generation.status === "failed"
                              ? "warning"
                              : "accent"
                        }
                      >
                        {statusLabel}
                      </Badge>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                  <span>{formatDateLabel(item.generation.createdAt, locale)}</span>
                  <span className="font-mono text-[var(--foreground)]">{formatMilliseconds(processingMs)}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button asChild type="button" size="sm" variant="outline">
                    <Link href={`/dashboard/generations/${generationId}`}>{t("history.detail")}</Link>
                  </Button>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStartTitleEdit(item)}
                      aria-label={t("history.editTitle")}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => setConfirmDeleteGenerationId(generationId)}
                      disabled={isDeleting}
                      aria-label={t("history.deleteGeneration")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {previewItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--foreground)_48%,transparent)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold tracking-[-0.01em] text-[var(--foreground)]">
                  {defaultTitle(previewItem, generatedLabel)}
                </h3>
                <p className="text-xs text-[var(--muted)]">{t("history.compareCaption")}</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setPreviewGenerationId(null)}
                aria-label={t("common.close")}
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.2em] text-[var(--muted)]">{t("generation.before")}</p>
                <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
                  <img
                    src={previewItem.reference.imageUrl}
                    alt={t("generation.before")}
                    className="aspect-[4/5] w-full object-contain bg-[var(--surface)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.2em] text-[var(--muted)]">{t("generation.after")}</p>
                {resolveAfterImage(previewItem) ? (
                  <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
                    <img
                      src={resolveAfterImage(previewItem)?.imageUrl}
                      alt={t("generation.after")}
                      className="aspect-[4/5] w-full object-contain bg-[var(--surface)]"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/5] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/80 text-sm text-[var(--muted-foreground)]">
                    {t("history.noGeneratedImageYet")}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button asChild type="button">
                <Link href={`/dashboard/generations/${previewItem.generation.id}`}>{t("history.openFullDetail")}</Link>
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[color-mix(in_srgb,var(--foreground)_56%,transparent)] p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_28px_84px_-28px_rgba(2,8,23,0.72)]">
            <h3 className="text-base font-semibold text-[var(--foreground)]">{t("history.deleteGeneration")}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{t("history.deleteConfirm")}</p>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDeleteGenerationId(null)}
                disabled={deletingGenerationId === deleteCandidate.generation.id}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => executeDeleteGeneration(deleteCandidate.generation.id)}
                disabled={deletingGenerationId === deleteCandidate.generation.id}
              >
                {deletingGenerationId === deleteCandidate.generation.id ? t("history.deleting") : t("history.deleteGeneration")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
