import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_TEXT_MODEL: z.string().default("gemini-2.5-flash"),
  GEMINI_IMAGE_MODEL: z.string().default("gemini-2.5-flash-image"),
  MINIO_ENDPOINT: z.string().min(1, "MINIO_ENDPOINT is required"),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  MINIO_ACCESS_KEY: z.string().min(1, "MINIO_ACCESS_KEY is required"),
  MINIO_SECRET_KEY: z.string().min(1, "MINIO_SECRET_KEY is required"),
  MINIO_BUCKET_UPLOADS: z.string().min(1, "MINIO_BUCKET_UPLOADS is required"),
  MINIO_BUCKET_GENERATIONS: z.string().min(1, "MINIO_BUCKET_GENERATIONS is required"),
  FACEFUSION_CONTAINER_NAME: z.string().default("identity-face"),
  FACEFUSION_SHARED_DATA_PATH: z.string().default("/data"),
  FACEFUSION_EXECUTION_PROVIDERS: z.string().default("cpu"),
  FACEFUSION_EXECUTION_THREAD_COUNT: z.coerce.number().int().min(1).max(32).default(4),
  FACEFUSION_OUTPUT_IMAGE_QUALITY: z.coerce.number().int().min(0).max(100).default(90),
  FACEFUSION_PROCESSORS_FAITHFUL: z.string().default("face_swapper"),
  FACEFUSION_PROCESSORS_EDITORIAL: z.string().default("face_swapper face_enhancer"),
  FACEFUSION_PROCESSORS_CINEMATIC: z.string().default("face_swapper face_enhancer frame_enhancer"),
  FACEFUSION_COMMAND_TIMEOUT_MS: z.coerce.number().int().min(10000).default(900000),
  FACEFUSION_KEEP_ARTIFACTS: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  JOB_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  JOB_ANALYSIS_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(5),
  JOB_GENERATION_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(20).default(10),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().min(500).default(3000),
  WORKER_HEALTH_PORT: z.coerce.number().int().positive().default(3001),
  WORKER_ID: z.string().default("identity-worker"),
  IDENTITY_MIN_VALID_IMAGES: z.coerce.number().int().min(1).max(12).default(4),
  IDENTITY_CLUSTER_SIMILARITY_THRESHOLD: z.coerce.number().min(0.5).max(0.99).default(0.82),
  IDENTITY_VALIDITY_SIMILARITY_THRESHOLD: z.coerce.number().int().min(40).max(95).default(70),
  GENERATION_IDENTITY_SIMILARITY_MIN: z.coerce.number().int().min(40).max(95).default(75),
  GENERATION_REFERENCE_COMPOSITION_MIN: z.coerce.number().int().min(40).max(95).default(70),
  GENERATION_BACKGROUND_PRESERVATION_MIN: z.coerce.number().int().min(40).max(95).default(65),
  GENERATION_POSE_MATCH_MIN: z.coerce.number().int().min(40).max(95).default(70),
  GENERATION_OVERALL_ACCEPTANCE_MIN: z.coerce.number().int().min(40).max(95).default(74),
  GENERATION_STRICT_MODERATION: z.enum(["true", "false"]).optional().transform((value) => value === "true"),
  GENERATION_VARIANT_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(4),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid environment configuration: ${message}`);
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}

export function resetEnvCacheForTests() {
  if (process.env.NODE_ENV === "test") {
    cachedEnv = null;
  }
}

