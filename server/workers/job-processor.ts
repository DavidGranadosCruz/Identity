import { imageSize } from "image-size";
import { AnalysisStatus, Prisma } from "@prisma/client";
import { createAiProviders } from "@/lib/ai/providers/factory";
import { buildRecreationPrompt } from "@/lib/ai/prompts/build-recreation-prompt";
import { referenceAnalysisSchema } from "@/lib/ai/schemas/reference-analysis-schema";
import { readFromStorage, uploadToStorage } from "@/lib/storage/storage-service";
import {
  analyzeIdentityImageHeuristics,
  buildIdentityImageScore,
} from "@/lib/utils/image-scoring";
import { getEnv } from "@/lib/utils/env";
import { AppError } from "@/lib/utils/errors";
import { GenerationRepository } from "@/server/repositories/generation-repository";
import { IdentityPackRepository } from "@/server/repositories/identity-pack-repository";
import { JobRepository } from "@/server/repositories/job-repository";
import { ReferenceRepository } from "@/server/repositories/reference-repository";
import { FaceEngineService } from "@/server/services/face-engine-service";
import { FaceFusionRuntimeService } from "@/server/services/facefusion-runtime-service";
import { GenerationService } from "@/server/services/generation-service";
import { IdentityPackService } from "@/server/services/identity-pack-service";
import { IdentityProfileService } from "@/server/services/identity-profile-service";
import { VisualValidationService } from "@/server/services/visual-validation-service";
import type { ReferenceAnalysis } from "@/types/domain";

const providers = createAiProviders();
const generationRepository = new GenerationRepository();
const identityPackRepository = new IdentityPackRepository();
const jobRepository = new JobRepository();
const referenceRepository = new ReferenceRepository();
const generationService = new GenerationService();
const identityPackService = new IdentityPackService();
const identityProfileService = new IdentityProfileService();
const faceEngineService = new FaceEngineService();
const visualValidationService = new VisualValidationService();
const faceFusionRuntimeService = new FaceFusionRuntimeService();

function toBase64(buffer: Buffer) {
  return buffer.toString("base64");
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function buildIdentityProfileSummary(params: {
  centroid: number[];
  profileJson: Prisma.JsonValue | null;
  selectedCount: number;
}) {
  const summary = params.profileJson && typeof params.profileJson === "object" ? params.profileJson : null;
  return [
    `Selected identity images: ${params.selectedCount}`,
    `Centroid length: ${params.centroid.length}`,
    `Profile summary: ${JSON.stringify(summary ?? {}, null, 2)}`,
  ].join("\n");
}

function asReferenceAnalysis(value: unknown): ReferenceAnalysis {
  const parsed = referenceAnalysisSchema.safeParse(value);
  if (!parsed.success) {
    throw new AppError("REFERENCE_NOT_READY", "La referencia no tiene analisis estructurado", 422);
  }

  return parsed.data;
}

function assertReferenceReady(referenceAnalysis: ReferenceAnalysis) {
  if (!referenceAnalysis.singlePersonClear || !referenceAnalysis.primaryFaceVisible || referenceAnalysis.subjectCount !== 1) {
    throw new AppError(
      "REFERENCE_NOT_SUPPORTED",
      "La referencia debe tener una sola persona con rostro visible para preservar identidad",
      422,
    );
  }

  if (referenceAnalysis.referenceQuality === "low") {
    throw new AppError("REFERENCE_QUALITY_LOW", "La referencia tiene calidad insuficiente para recreacion fiable", 422);
  }
}

const qualityOrder = {
  low: 0,
  medium: 1,
  high: 2,
} as const;

function minReferenceQuality(left: "low" | "medium" | "high", right: "low" | "medium" | "high") {
  return qualityOrder[left] <= qualityOrder[right] ? left : right;
}

function imageWarnings(image: { analysisJson: Prisma.JsonValue | null; identityDecisionReason: string | null }) {
  const analysis = image.analysisJson as {
    multimodal?: {
      watermarkDetected?: boolean;
      cutoutOrRenderDetected?: boolean;
      blurLevel?: string;
      multiplePeople?: boolean;
      faceVisible?: boolean;
    };
  } | null;

  const warnings: string[] = [];
  if (analysis?.multimodal?.watermarkDetected) warnings.push("watermark");
  if (analysis?.multimodal?.cutoutOrRenderDetected) warnings.push("cutout_or_render");
  if (analysis?.multimodal?.blurLevel === "high") warnings.push("high_blur");
  if (analysis?.multimodal?.multiplePeople) warnings.push("multiple_people");
  if (analysis?.multimodal?.faceVisible === false) warnings.push("face_not_visible");
  if (image.identityDecisionReason && image.identityDecisionReason.toLowerCase().startsWith("descartada")) {
    warnings.push("identity_rejected");
  }
  return warnings;
}

function rankIdentityCandidate(image: {
  score: number | null;
  identityConsistencyScore: number | null;
}) {
  return (image.identityConsistencyScore ?? 0) * 0.7 + (image.score ?? 0) * 0.3;
}

function deterministicIdentitySelection<
  T extends {
    id: string;
    score: number | null;
    identityConsistencyScore: number | null;
    analysisJson: Prisma.JsonValue | null;
    identityDecisionReason: string | null;
  },
>(
  images: T[],
  minRequiredImages: number,
) {
  const targetSelectionCount = Math.min(8, Math.max(minRequiredImages, 6));

  const sorted = [...images].sort((left, right) => rankIdentityCandidate(right) - rankIdentityCandidate(left));
  const selected = sorted.slice(0, targetSelectionCount);
  const rejected = sorted.slice(targetSelectionCount);

  return {
    selected,
    rationale:
      "deterministic_identity_first_ranking: selected by 0.7*identityConsistencyScore + 0.3*qualityScore, clamped to 4-8 (target 6).",
    rejectedImageReasons: rejected.map((image) => {
      const warning = imageWarnings(image)[0];
      const reason =
        warning ??
        image.identityDecisionReason ??
        `lower_rank(${rankIdentityCandidate(image).toFixed(1)})`;

      return {
        imageId: image.id,
        reason,
      };
    }),
  };
}

export class JobProcessor {
  private async updateProgress(jobId: string, progressPercent: number, stage: string, details?: Record<string, unknown>) {
    await jobRepository.updateRunningProgress(jobId, {
      progressPercent: Math.max(0, Math.min(100, Math.round(progressPercent))),
      stage,
      stageUpdatedAt: new Date().toISOString(),
      ...(details ?? {}),
    });
  }

  async process(job: {
    id: string;
    type: "analyze_identity_image" | "analyze_reference_image" | "generate_recreation";
    payloadJson: unknown;
  }) {
    if (job.type === "analyze_identity_image") {
      await this.processAnalyzeIdentityImage(job.id, job.payloadJson);
      return;
    }

    if (job.type === "analyze_reference_image") {
      await this.processAnalyzeReferenceImage(job.id, job.payloadJson);
      return;
    }

    if (job.type === "generate_recreation") {
      await this.processGenerateRecreation(job.id, job.payloadJson);
      return;
    }

    throw new AppError("UNKNOWN_JOB_TYPE", `Tipo de job no soportado: ${job.type}`, 400);
  }

  private async processAnalyzeIdentityImage(jobId: string, payload: unknown) {
    const imageId =
      payload && typeof payload === "object" && "imageId" in payload && typeof payload.imageId === "string"
        ? payload.imageId
        : null;

    if (!imageId) {
      throw new AppError("INVALID_JOB_PAYLOAD", "Falta imageId en el payload del job", 400);
    }

    const image = await identityPackRepository.getImageWithPack(imageId);
    if (!image) {
      throw new AppError("IMAGE_NOT_FOUND", "Imagen de identidad no encontrada", 404);
    }

    await identityPackRepository.markImageRunning(image.id);
    await this.updateProgress(jobId, 10, "Analizando foto de identidad");
    let succeeded = false;

    try {
      const file = await readFromStorage({
        bucket: "uploads",
        storagePath: image.storagePath,
      });

      const heuristics = analyzeIdentityImageHeuristics({
        width: image.width,
        height: image.height,
        fileSize: image.fileSize,
      });
      await this.updateProgress(jobId, 40, "Extrayendo rasgos faciales y calidad");

      const localFaceAnalysis = await faceEngineService.analyzeIdentityImage({
        buffer: file.body,
        mimeType: image.mimeType,
      });

      const multimodal = {
        faceVisible: localFaceAnalysis.faceVisible,
        facePartiallyCovered: localFaceAnalysis.facePartiallyCovered,
        faceCount: localFaceAnalysis.faceCount,
        multiplePeople: localFaceAnalysis.multiplePeople,
        extremeProfile: localFaceAnalysis.extremeProfile,
        blurLevel: localFaceAnalysis.blurLevel,
        watermarkDetected: localFaceAnalysis.watermarkDetected,
        cutoutOrRenderDetected: localFaceAnalysis.cutoutOrRenderDetected,
        poseType: localFaceAnalysis.poseType,
        lighting: localFaceAnalysis.lighting,
        perceivedSharpness: localFaceAnalysis.perceivedSharpness,
        recreationSuitability: localFaceAnalysis.recreationSuitability,
        identityDescriptor: localFaceAnalysis.identityDescriptor,
        identityEmbedding: localFaceAnalysis.identityEmbedding,
        recommendationReason: localFaceAnalysis.recommendationReason,
      };

      const provisionalScore = buildIdentityImageScore({
        heuristics,
        multimodal,
        identityConsistencyScore: 60,
      });

      await identityPackRepository.updateImageAnalysis({
        imageId: image.id,
        score: provisionalScore.finalScore,
        keepRecommendation: provisionalScore.recommendation,
        analysisJson: toJsonValue({
          heuristics,
          multimodal,
          scoreBreakdown: {
            heuristicScore: provisionalScore.heuristicScore,
            multimodalScore: provisionalScore.multimodalScore,
            consistencyScore: provisionalScore.consistencyScore,
            finalScore: provisionalScore.finalScore,
          },
          recommendation: provisionalScore.recommendation,
          reasons: provisionalScore.reasons,
          localFaceEngine: {
            qualityScore: localFaceAnalysis.qualityScore,
            blurScore: localFaceAnalysis.blurScore,
            brightnessScore: localFaceAnalysis.brightnessScore,
            faceCoverageRatio: localFaceAnalysis.faceCoverageRatio,
            yaw: localFaceAnalysis.yaw,
            pitch: localFaceAnalysis.pitch,
            roll: localFaceAnalysis.roll,
            boundingBox: localFaceAnalysis.boundingBox,
          },
        }),
      });

      await identityProfileService.rebuildForPack(image.packId);
      await this.updateProgress(jobId, 80, "Recalculando perfil de identidad del pack");

      const refreshedImage = await identityPackRepository.getImageWithPack(image.id);
      if (refreshedImage) {
        const analysis = refreshedImage.analysisJson as
          | {
              heuristics?: {
                resolutionScore: number;
                dimensionsScore: number;
                ratioScore: number;
                fileWeightScore: number;
                orientation: "portrait" | "landscape" | "square";
                ratio: number;
                minDimensionsPassed: boolean;
              };
              multimodal?: {
                faceVisible: boolean;
                facePartiallyCovered: boolean;
                faceCount: number;
                multiplePeople: boolean;
                extremeProfile: boolean;
                blurLevel: "low" | "medium" | "high";
                watermarkDetected: boolean;
                cutoutOrRenderDetected: boolean;
                poseType: "frontal" | "semi_profile" | "profile" | "unknown";
                lighting: "poor" | "fair" | "good" | "excellent";
                perceivedSharpness: "poor" | "fair" | "good" | "excellent";
                recreationSuitability: "low" | "medium" | "high";
                identityDescriptor: string;
                identityEmbedding: number[];
                recommendationReason: string;
              };
            }
          | null;

        if (analysis?.heuristics && analysis.multimodal) {
          const finalScore = buildIdentityImageScore({
            heuristics: analysis.heuristics,
            multimodal: analysis.multimodal,
            identityConsistencyScore: refreshedImage.identityConsistencyScore ?? 50,
          });

          await identityPackRepository.updateImageAnalysis({
            imageId: refreshedImage.id,
            score: finalScore.finalScore,
            keepRecommendation: finalScore.recommendation,
            analysisJson: toJsonValue({
              ...analysis,
              scoreBreakdown: {
                heuristicScore: finalScore.heuristicScore,
                multimodalScore: finalScore.multimodalScore,
                consistencyScore: finalScore.consistencyScore,
                finalScore: finalScore.finalScore,
              },
              recommendation: finalScore.recommendation,
              reasons: finalScore.reasons,
              identityClusterId: refreshedImage.identityClusterId,
              identityConsistencyScore: refreshedImage.identityConsistencyScore,
              isIdentityValid: refreshedImage.isIdentityValid,
              identityDecisionReason: refreshedImage.identityDecisionReason,
            }),
          });
        }
      }
      succeeded = true;
    } catch (error) {
      await identityPackRepository.markImageFailed(
        image.id,
        error instanceof Error ? error.message : "Error desconocido en analisis de identidad",
      );
      throw error;
    } finally {
      await identityPackService.refreshPackStatus(image.packId);
      if (succeeded) {
        await this.updateProgress(jobId, 100, "Analisis de identidad completado");
      }
    }
  }

  private async processAnalyzeReferenceImage(jobId: string, payload: unknown) {
    const referenceImageId =
      payload &&
      typeof payload === "object" &&
      "referenceImageId" in payload &&
      typeof payload.referenceImageId === "string"
        ? payload.referenceImageId
        : null;

    if (!referenceImageId) {
      throw new AppError("INVALID_JOB_PAYLOAD", "Falta referenceImageId en el payload del job", 400);
    }

    const reference = await referenceRepository.findById(referenceImageId);
    if (!reference) {
      throw new AppError("REFERENCE_NOT_FOUND", "Referencia no encontrada", 404);
    }

    await referenceRepository.markRunning(reference.id);
    await this.updateProgress(jobId, 10, "Analizando referencia");
    let succeeded = false;

    try {
      const file = await readFromStorage({
        bucket: "uploads",
        storagePath: reference.storagePath,
      });

      const analysis = await providers.analysisProvider.analyzeReferenceImage({
        imageBase64: toBase64(file.body),
        mimeType: reference.mimeType,
      });
      await this.updateProgress(jobId, 55, "Combinando analisis estructurado y validacion local");

      const localReference = await faceEngineService.analyzeReferenceImage({
        buffer: file.body,
        mimeType: reference.mimeType,
      });

      const mergedAnalysis = {
        ...analysis.analysis,
        subjectCount: localReference.subjectCount,
        singlePersonClear: localReference.singlePersonClear,
        primaryFaceVisible: localReference.primaryFaceVisible,
        referenceQuality: minReferenceQuality(analysis.analysis.referenceQuality, localReference.referenceQuality),
        compositionLockNotes: Array.from(new Set([...(analysis.analysis.compositionLockNotes ?? []), ...localReference.lockNotes])),
      };

      await referenceRepository.completeAnalysis(
        reference.id,
        toJsonValue({
          ...mergedAnalysis,
          localFaceEngine: localReference.diagnostics,
          providerRaw: analysis.raw,
        }),
      );
      succeeded = true;
    } catch (error) {
      await referenceRepository.failAnalysis(
        reference.id,
        error instanceof Error ? error.message : "Error desconocido en analisis de referencia",
      );
      throw error;
    } finally {
      if (succeeded) {
        await this.updateProgress(jobId, 100, "Analisis de referencia completado");
      }
    }
  }

  private async processGenerateRecreation(jobId: string, payload: unknown) {
    const env = getEnv();
    const generationId =
      payload && typeof payload === "object" && "generationId" in payload && typeof payload.generationId === "string"
        ? payload.generationId
        : null;

    const payloadSelectedIds =
      payload &&
      typeof payload === "object" &&
      "selectedIdentityImageIds" in payload &&
      Array.isArray(payload.selectedIdentityImageIds)
        ? payload.selectedIdentityImageIds.filter((value): value is string => typeof value === "string")
        : [];

    if (!generationId) {
      throw new AppError("INVALID_JOB_PAYLOAD", "Falta generationId en el payload del job", 400);
    }

    const generation = await generationRepository.findById(generationId);
    if (!generation) {
      throw new AppError("GENERATION_NOT_FOUND", "Generacion no encontrada", 404);
    }

    if (generation.referenceImage.analysisStatus !== AnalysisStatus.completed || !generation.referenceImage.analysisJson) {
      throw new AppError("REFERENCE_NOT_READY", "La referencia debe estar analizada antes de generar", 422);
    }
    await this.updateProgress(jobId, 6, "Validando referencia e identidad");

    const referenceAnalysis = asReferenceAnalysis(generation.referenceImage.analysisJson);
    assertReferenceReady(referenceAnalysis);

    const profile = await identityProfileService.requireReadyProfile(generation.packId);
    const profileCentroid = Array.isArray(profile.centroidVectorJson) ? (profile.centroidVectorJson as number[]) : [];

    const packImages = await generationRepository.listPackImages(generation.packId);
    const validPackImages = packImages.filter(
      (image) => image.analysisStatus === AnalysisStatus.completed && image.isIdentityValid === true,
    );

    if (validPackImages.length < profile.minRequiredImages) {
      throw new AppError(
        "INSUFFICIENT_VALID_IDENTITY_IMAGES",
        `No hay suficientes imagenes validas (${validPackImages.length}/${profile.minRequiredImages})`,
        422,
      );
    }
    await this.updateProgress(jobId, 16, "Perfil de identidad validado");

    const selectedByUser = payloadSelectedIds.length
      ? payloadSelectedIds
          .map((id) => packImages.find((image) => image.id === id))
          .filter((image): image is (typeof packImages)[number] => Boolean(image))
      : [];

    const invalidManualSelections = selectedByUser.filter((image) => !image.isIdentityValid);
    if (invalidManualSelections.length) {
      throw new AppError(
        "INVALID_IDENTITY_SELECTION",
        "Las imagenes seleccionadas manualmente no son aptas para identidad",
        422,
      );
    }

    const selectedByModel =
      selectedByUser.length > 0
        ? {
            selected: selectedByUser,
            rationale: "manual_selection",
            rejectedImageReasons: [] as Array<{ imageId: string; reason: string }>,
          }
        : deterministicIdentitySelection(validPackImages, profile.minRequiredImages);
    await this.updateProgress(jobId, 24, "Seleccionando mejores fotos de identidad");

    const selected = selectedByModel.selected;

    if (selected.length < profile.minRequiredImages) {
      throw new AppError(
        "NO_SELECTED_IMAGES",
        `No se pudieron seleccionar suficientes imagenes de identidad (${selected.length}/${profile.minRequiredImages})`,
        422,
      );
    }

    const referenceFile = await readFromStorage({
      bucket: "uploads",
      storagePath: generation.referenceImage.storagePath,
    });

    const referenceFaceAnalysis = await faceEngineService.analyzeIdentityImage({
      buffer: referenceFile.body,
      mimeType: generation.referenceImage.mimeType,
    });

    if (referenceFaceAnalysis.faceCount !== 1 || !referenceFaceAnalysis.faceVisible || referenceFaceAnalysis.facePartiallyCovered) {
      throw new AppError(
        "REFERENCE_NOT_SUPPORTED",
        "La referencia debe mostrar una sola persona con rostro claramente visible",
        422,
      );
    }

    if (referenceFaceAnalysis.recreationSuitability === "low") {
      throw new AppError(
        "REFERENCE_QUALITY_LOW",
        "La referencia es demasiado degradada para bloquear identidad y escena con precision",
        422,
      );
    }
    await this.updateProgress(jobId, 34, "Referencia bloqueada: escena lista para sustitucion");

    await generationService.markProcessing(generation.id);

    const identityInputs = await Promise.all(
      selected.map(async (image) => {
        const raw = await readFromStorage({
          bucket: "uploads",
          storagePath: image.storagePath,
        });

        return {
          id: image.id,
          buffer: raw.body,
          mimeType: image.mimeType,
          identityConsistencyScore: image.identityConsistencyScore ?? 0,
          score: image.score ?? 0,
        };
      }),
    );
    await this.updateProgress(jobId, 42, "Preparando datos para FaceFusion");

    const identityProfileSummary = buildIdentityProfileSummary({
      centroid: profileCentroid,
      profileJson: profile.profileJson,
      selectedCount: identityInputs.length,
    });

    const variantsToGenerate: Array<"faithful" | "editorial" | "cinematic"> = ["faithful", "editorial", "cinematic"];
    const variantAttemptSummary: Record<string, { attempts: number; rejectedReasons: string[] }> = {};

    const createdVariants = [] as Array<{
      variantType: "faithful" | "editorial" | "cinematic";
      storagePath: string;
      mimeType: string;
      width: number;
      height: number;
      fileSize: number;
      identitySimilarityScore: number;
      referenceCompositionScore: number;
      backgroundPreservationScore: number;
      poseMatchScore: number;
      overallAcceptanceScore: number;
      accepted: boolean;
      rejectionReason: string | null;
      metadataJson: Prisma.InputJsonValue;
    }>;

    for (const [variantIndex, variantType] of variantsToGenerate.entries()) {
      let acceptedVariant: (typeof createdVariants)[number] | null = null;
      const rejectedReasons: string[] = [];
      let lastError: unknown;
      let attemptsUsed = 0;
      const variantBaseProgress = 42 + variantIndex * 18;

      for (let attempt = 1; attempt <= env.GENERATION_VARIANT_MAX_RETRIES; attempt += 1) {
        attemptsUsed = attempt;
        await this.updateProgress(
          jobId,
          variantBaseProgress + (attempt - 1) * 3,
          `Generando variante ${variantType} (intento ${attempt}/${env.GENERATION_VARIANT_MAX_RETRIES})`,
          {
            currentVariant: variantType,
            attempt,
          },
        );
        const prompt = buildRecreationPrompt({
          analysis: referenceAnalysis,
          referenceFidelity: generation.referenceFidelity,
          identityStrength: generation.identityStrength,
          variant: variantType,
          identityProfileSummary,
          rejectedReasons,
        });

        try {
          const runtimeOutput = await faceFusionRuntimeService.generateVariant({
            generationId: generation.id,
            variantType,
            referenceImage: {
              buffer: referenceFile.body,
              mimeType: generation.referenceImage.mimeType,
            },
            identityImages: identityInputs.map((item) => ({
              id: item.id,
              buffer: item.buffer,
              mimeType: item.mimeType,
            })),
            attempt,
          });

          const binary = runtimeOutput.buffer;
          const generatedFaceAnalysis = await faceEngineService.analyzeIdentityImage({
            buffer: binary,
            mimeType: runtimeOutput.mimeType,
          });

          const validator = await visualValidationService.validateVariant({
            referenceBuffer: referenceFile.body,
            referenceMimeType: generation.referenceImage.mimeType,
            generatedBuffer: binary,
            generatedMimeType: runtimeOutput.mimeType,
            profileCentroid,
            referenceFace: referenceFaceAnalysis,
            generatedFace: generatedFaceAnalysis,
            thresholds: {
              identity: env.GENERATION_IDENTITY_SIMILARITY_MIN,
              composition: env.GENERATION_REFERENCE_COMPOSITION_MIN,
              background: env.GENERATION_BACKGROUND_PRESERVATION_MIN,
              pose: env.GENERATION_POSE_MATCH_MIN,
              overall: env.GENERATION_OVERALL_ACCEPTANCE_MIN,
            },
          });

          if (!validator.accepted) {
            const reason =
              validator.rejectionReason ??
              `Variant rejected: identity=${validator.identitySimilarityScore}, composition=${validator.referenceCompositionScore}, background=${validator.backgroundPreservationScore}, pose=${validator.poseMatchScore}`;
            rejectedReasons.push(reason);
            continue;
          }
          const dimensions = imageSize(binary);

          const outputExtension = runtimeOutput.mimeType.includes("png") ? "png" : "jpg";
          const storagePath = `${generation.userId}/${generation.id}/${variantType}-${Date.now()}.${outputExtension}`;

          await uploadToStorage({
            bucket: "generations",
            storagePath,
            body: binary,
            contentType: runtimeOutput.mimeType,
          });

          acceptedVariant = {
            variantType,
            storagePath,
            mimeType: runtimeOutput.mimeType,
            width: dimensions.width ?? 0,
            height: dimensions.height ?? 0,
            fileSize: binary.length,
            identitySimilarityScore: validator.identitySimilarityScore,
            referenceCompositionScore: validator.referenceCompositionScore,
            backgroundPreservationScore: validator.backgroundPreservationScore,
            poseMatchScore: validator.poseMatchScore,
            overallAcceptanceScore: validator.overallAcceptanceScore,
            accepted: true,
            rejectionReason: null,
            metadataJson: toJsonValue({
              variantType,
              prompt,
              width: dimensions.width ?? 0,
              height: dimensions.height ?? 0,
              mimeType: runtimeOutput.mimeType,
              model: "facefusion-headless",
              runtime: {
                elapsedMs: runtimeOutput.elapsedMs,
                processors: runtimeOutput.processors,
                command: runtimeOutput.command,
                outputPath: runtimeOutput.outputPath,
                stdout: runtimeOutput.stdout.slice(-12000),
                stderr: runtimeOutput.stderr.slice(-12000),
                attempt,
              },
              generationIdentityAnalysis: generatedFaceAnalysis,
              validation: {
                identitySimilarityScore: validator.identitySimilarityScore,
                referenceCompositionScore: validator.referenceCompositionScore,
                backgroundPreservationScore: validator.backgroundPreservationScore,
                poseMatchScore: validator.poseMatchScore,
                overallAcceptanceScore: validator.overallAcceptanceScore,
                accepted: validator.accepted,
                rejectionReason: validator.rejectionReason,
                diagnostics: validator.diagnostics,
              },
              thoughtSignature: null,
            }),
          };
          await this.updateProgress(jobId, variantBaseProgress + 14, `Variante ${variantType} aceptada`);

          break;
        } catch (error) {
          lastError = error;
          rejectedReasons.push(error instanceof Error ? error.message : String(error));
        }
      }

      variantAttemptSummary[variantType] = {
        attempts: attemptsUsed,
        rejectedReasons,
      };

      if (!acceptedVariant) {
        const reasonText = rejectedReasons.join(" | ");
        throw lastError instanceof Error
          ? new AppError(
              "IDENTITY_VALIDATION_FAILED",
              `No se pudo preservar la identidad con precision suficiente para ${variantType}. ${reasonText || lastError.message}`,
              422,
            )
          : new AppError(
              "IDENTITY_VALIDATION_FAILED",
              `No se pudo preservar la identidad con precision suficiente para ${variantType}. ${reasonText}`,
              422,
            );
      }

      createdVariants.push(acceptedVariant);
    }

    await this.updateProgress(jobId, 94, "Persistiendo variantes en almacenamiento");
    await generationRepository.addVariants(generation.id, createdVariants);

    await generationService.markCompleted({
      generationId: generation.id,
      provider: "facefusion",
      providerModel: "facefusion-headless",
      promptJson: toJsonValue({
        pipeline: "identity-first-reference-locked-facefusion",
        referenceFidelity: generation.referenceFidelity,
        identityStrength: generation.identityStrength,
        selectorRationale: selectedByModel.rationale,
        selectorRejected: selectedByModel.rejectedImageReasons,
        attemptsByVariant: variantAttemptSummary,
      }),
      selectedIdentityImagesJson: toJsonValue(selected.map((image) => image.id)),
    });
    await this.updateProgress(jobId, 100, "Generacion completada. Bajando a resultados.");
  }
}
