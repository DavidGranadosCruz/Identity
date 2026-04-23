import type {
  GenerationBundle,
  GenerationRequest,
  IdentityPack,
  IdentityPackImage,
  IdentityProfile,
  Job,
  ReferenceImage,
  UserSettings,
} from "@/types/domain";

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiFailure {
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface PatchUserSettingsPayload {
  defaultFidelity: number;
  defaultIdentityStrength: number;
  watermarkEnabled: boolean;
}

export interface IdentityPackWithImages {
  pack: IdentityPack;
  profile: IdentityProfile | null;
  images: IdentityPackImage[];
}

export interface CreateReferenceResult {
  reference: ReferenceImage;
  analyzeJob: Job;
}

export interface CreateGenerationResult {
  generationId: string;
  jobId: string;
  status: "queued";
}

export interface DashboardData {
  latestPack: IdentityPack | null;
  latestReference: ReferenceImage | null;
  latestGeneration: GenerationBundle | null;
  settings: UserSettings;
}

export type CreateGenerationPayload = GenerationRequest;

