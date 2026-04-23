export type GenerationVariantType = "faithful" | "editorial" | "cinematic";
export type GenerationStatus = "queued" | "processing" | "completed" | "failed";
export type IdentityPackStatus = "draft" | "analyzing" | "ready" | "failed";
export type AnalysisStatus = "pending" | "running" | "completed" | "failed";
export type KeepRecommendation = "keep" | "replace";
export type JobStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type JobType = "analyze_identity_image" | "analyze_reference_image" | "generate_recreation";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IdentityPack {
  id: string;
  userId: string;
  name: string;
  status: IdentityPackStatus;
  createdAt: string;
  updatedAt: string;
}

export type IdentityPackSummaryStatus = "ready" | "pending" | "blocked";
export type IdentityPackSummaryReason =
  | "ready"
  | "empty"
  | "analyzing"
  | "failed"
  | "insufficient_valid_images"
  | "profile_not_ready";

export interface IdentityPackSummary {
  pack: IdentityPack;
  profile: IdentityProfile | null;
  imageCount: number;
  validImageCount: number;
  minRequiredImages: number;
  readyForGeneration: boolean;
  statusLabel: IdentityPackSummaryStatus;
  statusReason: IdentityPackSummaryReason;
}

export interface IdentityPackWorkspaceData {
  packs: IdentityPackSummary[];
  selectedPackId: string | null;
  packData: {
    pack: IdentityPack;
    profile: IdentityProfile | null;
    images: IdentityPackImage[];
  } | null;
}

export interface IdentityImageHeuristicAnalysis {
  resolutionScore: number;
  dimensionsScore: number;
  ratioScore: number;
  fileWeightScore: number;
  orientation: "portrait" | "landscape" | "square";
  ratio: number;
  minDimensionsPassed: boolean;
}

export interface IdentityImageMultimodalAnalysis {
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
}

export interface IdentityImageAnalysis {
  heuristics: IdentityImageHeuristicAnalysis;
  multimodal: IdentityImageMultimodalAnalysis;
  scoreBreakdown: {
    heuristicScore: number;
    multimodalScore: number;
    consistencyScore: number;
    finalScore: number;
  };
  recommendation: KeepRecommendation;
  reasons: string[];
  identityClusterId?: string | null;
  identityConsistencyScore?: number | null;
  isIdentityValid?: boolean | null;
  identityDecisionReason?: string | null;
  providerRaw?: unknown;
}

export interface IdentityPackImage {
  id: string;
  packId: string;
  storagePath: string;
  imageUrl: string;
  originalFilename: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  analysisStatus: AnalysisStatus;
  score: number | null;
  keepRecommendation: KeepRecommendation | null;
  analysisJson: IdentityImageAnalysis | null;
  identityClusterId: string | null;
  identityConsistencyScore: number | null;
  isIdentityValid: boolean | null;
  identityDecisionReason: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceAnalysis {
  shotType: string;
  cameraAngle: string;
  composition: string;
  poseDescription: string;
  facialExpression: string;
  gazeDirection: string;
  lighting: string;
  environment: string;
  wardrobe: string;
  colorPalette: string[];
  mood: string;
  realismLevel: string;
  importantDoNotChangeElements: string[];
  backgroundDescription: string;
  bodyVisibility: string;
  styleKeywords: string[];
  subjectCount: number;
  singlePersonClear: boolean;
  primaryFaceVisible: boolean;
  heldObjects: string[];
  compositionLockNotes: string[];
  referenceQuality: "low" | "medium" | "high";
}

export interface ReferenceImage {
  id: string;
  userId: string;
  storagePath: string;
  imageUrl: string;
  originalFilename: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  analysisStatus: AnalysisStatus;
  analysisJson: ReferenceAnalysis | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationRequest {
  packId: string;
  referenceImageId: string;
  referenceFidelity: number;
  identityStrength: number;
  selectedIdentityImageIds?: string[];
}

export interface GenerationVariantMetadata {
  variantType: GenerationVariantType;
  prompt: string;
  width: number;
  height: number;
  mimeType: string;
  model: string;
  providerResponse?: unknown;
  thoughtSignature?: string;
  validation?: VariantValidationResult;
}

export interface VariantValidationResult {
  identitySimilarityScore: number;
  referenceCompositionScore: number;
  backgroundPreservationScore: number;
  poseMatchScore: number;
  overallAcceptanceScore: number;
  accepted: boolean;
  rejectionReason: string | null;
  validatorRaw?: unknown;
}

export interface GenerationVariant {
  id: string;
  generationId: string;
  variantType: GenerationVariantType;
  storagePath: string;
  imageUrl: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  identitySimilarityScore: number | null;
  referenceCompositionScore: number | null;
  backgroundPreservationScore: number | null;
  poseMatchScore: number | null;
  overallAcceptanceScore: number | null;
  accepted: boolean;
  rejectionReason: string | null;
  metadataJson: GenerationVariantMetadata | null;
  createdAt: string;
}

export interface Generation {
  id: string;
  userId: string;
  packId: string;
  referenceImageId: string;
  title: string | null;
  status: GenerationStatus;
  referenceFidelity: number;
  identityStrength: number;
  promptJson: Record<string, unknown> | null;
  selectedIdentityImagesJson: string[] | null;
  provider: string | null;
  providerModel: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  payloadJson: Record<string, unknown>;
  resultJson: Record<string, unknown> | null;
  errorMessage: string | null;
  attempts: number;
  runAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  defaultFidelity: number;
  defaultIdentityStrength: number;
  watermarkEnabled: boolean;
  themePreference: "system" | "light" | "dark";
  languagePreference: "es" | "en";
  createdAt: string;
  updatedAt: string;
}

export interface IdentityProfile {
  id: string;
  packId: string;
  status: AnalysisStatus;
  minRequiredImages: number;
  validImageCount: number;
  rejectedImageCount: number;
  consistencyScore: number | null;
  primaryClusterId: string | null;
  centroidVectorJson: number[] | null;
  profileJson: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GenerationBundle {
  generation: Generation;
  variants: GenerationVariant[];
  reference: ReferenceImage;
  selectedIdentityImages: IdentityPackImage[];
  identityProfile: IdentityProfile | null;
  jobs: Job[];
}

