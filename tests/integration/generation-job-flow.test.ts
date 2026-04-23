import { afterEach, describe, expect, it, vi } from "vitest";
import { GenerationRepository } from "@/server/repositories/generation-repository";
import { IdentityPackRepository } from "@/server/repositories/identity-pack-repository";
import { ReferenceRepository } from "@/server/repositories/reference-repository";
import { JobService } from "@/server/services/job-service";
import { GenerationService } from "@/server/services/generation-service";
import { IdentityProfileService } from "@/server/services/identity-profile-service";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GenerationService smoke", () => {
  it("creates generation and enqueue generation job", async () => {
    vi.spyOn(IdentityPackRepository.prototype, "findByIdForUser").mockResolvedValue({
      id: "pack_1",
      userId: "user_1",
      name: "Pack",
      status: "ready",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.spyOn(ReferenceRepository.prototype, "findByIdForUser").mockResolvedValue({
      id: "ref_1",
      userId: "user_1",
      storagePath: "u/ref/a.jpg",
      originalFilename: "a.jpg",
      mimeType: "image/jpeg",
      width: 1024,
      height: 1024,
      fileSize: 1000,
      analysisStatus: "completed",
      analysisJson: {
        shotType: "portrait",
        cameraAngle: "eye-level",
        composition: "centered",
        poseDescription: "standing",
        facialExpression: "neutral",
        gazeDirection: "camera",
        lighting: "soft",
        environment: "stadium",
        wardrobe: "sports kit",
        colorPalette: ["blue"],
        mood: "energetic",
        realismLevel: "high",
        importantDoNotChangeElements: ["pose", "framing"],
        backgroundDescription: "stadium crowd",
        bodyVisibility: "full body",
        styleKeywords: ["sports"],
        subjectCount: 1,
        singlePersonClear: true,
        primaryFaceVisible: true,
        heldObjects: ["trophy"],
        compositionLockNotes: ["keep camera distance"],
        referenceQuality: "high",
      },
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.spyOn(IdentityProfileService.prototype, "requireReadyProfile").mockResolvedValue({
      id: "profile_1",
      packId: "pack_1",
      status: "completed",
      minRequiredImages: 4,
      validImageCount: 4,
      rejectedImageCount: 0,
      consistencyScore: 90,
      primaryClusterId: "cluster_1",
      centroidVectorJson: Array.from({ length: 32 }).map(() => 0.2),
      profileJson: {},
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.spyOn(IdentityPackRepository.prototype, "listImages").mockResolvedValue(
      Array.from({ length: 4 }).map((_, index) => ({
        id: `img_${index}`,
        packId: "pack_1",
        storagePath: `u/identity/${index}.jpg`,
        originalFilename: `${index}.jpg`,
        mimeType: "image/jpeg",
        width: 1000,
        height: 1000,
        fileSize: 2000,
        analysisStatus: "completed",
        score: 85,
        keepRecommendation: "keep",
        analysisJson: {},
        identityClusterId: "cluster_1",
        identityConsistencyScore: 88,
        isIdentityValid: true,
        identityDecisionReason: "valid",
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as never,
    );

    vi.spyOn(GenerationRepository.prototype, "createGeneration").mockResolvedValue({
      id: "gen_1",
      userId: "user_1",
      packId: "pack_1",
      referenceImageId: "ref_1",
      status: "queued",
      referenceFidelity: 80,
      identityStrength: 75,
      promptJson: null,
      selectedIdentityImagesJson: null,
      provider: null,
      providerModel: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    vi.spyOn(JobService.prototype, "enqueueGenerationJob").mockResolvedValue({
      id: "job_1",
      type: "generate_recreation",
      status: "pending",
      payloadJson: {},
      resultJson: null,
      errorMessage: null,
      attempts: 0,
      runAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const service = new GenerationService();

    const result = await service.createGeneration("user_1", {
      packId: "pack_1",
      referenceImageId: "ref_1",
      referenceFidelity: 80,
      identityStrength: 75,
    });

    expect(result.generationId).toBe("gen_1");
    expect(result.jobId).toBe("job_1");
    expect(result.status).toBe("queued");
  });
});
