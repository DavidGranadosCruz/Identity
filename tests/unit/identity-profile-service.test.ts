import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalysisStatus } from "@prisma/client";
import { IdentityPackRepository } from "@/server/repositories/identity-pack-repository";
import { IdentityProfileService } from "@/server/services/identity-profile-service";

afterEach(() => {
  vi.restoreAllMocks();
});

function buildImage(id: string, embeddingValue: number) {
  return {
    id,
    packId: "pack_1",
    storagePath: `uploads/${id}.jpg`,
    originalFilename: `${id}.jpg`,
    mimeType: "image/jpeg",
    width: 1200,
    height: 1600,
    fileSize: 100000,
    analysisStatus: AnalysisStatus.completed,
    score: 80,
    keepRecommendation: "keep",
    analysisJson: {
      multimodal: {
        faceVisible: true,
        facePartiallyCovered: false,
        faceCount: 1,
        multiplePeople: false,
        extremeProfile: false,
        blurLevel: "low",
        watermarkDetected: false,
        cutoutOrRenderDetected: false,
        poseType: "frontal",
        lighting: "good",
        perceivedSharpness: "good",
        recreationSuitability: "high",
        identityDescriptor: "sample",
        identityEmbedding: Array.from({ length: 32 }).map(() => embeddingValue),
        recommendationReason: "ok",
      },
    },
    identityClusterId: null,
    identityConsistencyScore: null,
    isIdentityValid: null,
    identityDecisionReason: null,
    errorMessage: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("IdentityProfileService", () => {
  it("marks pack as completed when one clear identity cluster exists", async () => {
    vi.spyOn(IdentityPackRepository.prototype, "listImages").mockResolvedValue(
      ["img_1", "img_2", "img_3", "img_4", "img_5"].map((id) => buildImage(id, 0.25)) as never,
    );

    const applySpy = vi.spyOn(IdentityPackRepository.prototype, "applyIdentityConsistency").mockResolvedValue([] as never);
    const profileSpy = vi.spyOn(IdentityPackRepository.prototype, "upsertIdentityProfile").mockResolvedValue({} as never);

    const service = new IdentityProfileService();
    const result = await service.rebuildForPack("pack_1");

    expect(result.status).toBe(AnalysisStatus.completed);
    expect(result.validImageIds.length).toBeGreaterThanOrEqual(4);
    expect(applySpy).toHaveBeenCalledOnce();
    expect(profileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        packId: "pack_1",
        status: AnalysisStatus.completed,
      }),
    );
  });

  it("fails when there are two strong identity clusters", async () => {
    const clusterA = ["img_a1", "img_a2", "img_a3", "img_a4"].map((id) => buildImage(id, 0.6));
    const clusterB = ["img_b1", "img_b2", "img_b3"].map((id) => buildImage(id, -0.6));

    vi.spyOn(IdentityPackRepository.prototype, "listImages").mockResolvedValue([...clusterA, ...clusterB] as never);
    vi.spyOn(IdentityPackRepository.prototype, "applyIdentityConsistency").mockResolvedValue([] as never);
    const profileSpy = vi.spyOn(IdentityPackRepository.prototype, "upsertIdentityProfile").mockResolvedValue({} as never);

    const service = new IdentityProfileService();
    const result = await service.rebuildForPack("pack_1");

    expect(result.status).toBe(AnalysisStatus.failed);
    expect(result.hasAmbiguousIdentities).toBe(true);
    expect(profileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        status: AnalysisStatus.failed,
      }),
    );
  });
});
