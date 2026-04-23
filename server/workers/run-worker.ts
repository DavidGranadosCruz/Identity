import http from "node:http";
import { prisma } from "@/lib/db/prisma";
import { JobRepository } from "@/server/repositories/job-repository";
import { JobService } from "@/server/services/job-service";
import { GenerationService } from "@/server/services/generation-service";
import { JobProcessor } from "@/server/workers/job-processor";

const jobRepository = new JobRepository();
const jobService = new JobService();
const generationService = new GenerationService();
const processor = new JobProcessor();

const config = jobService.getWorkerConfig();
let lastHeartbeat = Date.now();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startHealthServer() {
  const server = http.createServer((_, response) => {
    const isFresh = Date.now() - lastHeartbeat < config.pollIntervalMs * 10;
    const statusCode = isFresh ? 200 : 503;

    response.writeHead(statusCode, {
      "Content-Type": "application/json",
    });

    response.end(
      JSON.stringify({
        ok: isFresh,
        workerId: config.workerId,
        lastHeartbeat,
      }),
    );
  });

  server.listen(config.healthPort, () => {
    console.log(`[worker] health endpoint on :${config.healthPort}`);
  });
}

function parseRetryDelayToMs(value: string | null | undefined) {
  if (!value) return undefined;

  const seconds = Number(value.replace(/s$/i, ""));
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;

  return Math.ceil(seconds * 1000);
}

function resolveMaxAttemptsForJob(job: { type: string; maxAttempts: number }, workerConfiguredMaxAttempts: number) {
  if (job.type === "generate_recreation") {
    return Math.max(workerConfiguredMaxAttempts, job.maxAttempts, 8);
  }
  return Math.max(workerConfiguredMaxAttempts, job.maxAttempts);
}

function extractProviderError(rawMessage: string) {
  const trimmed = rawMessage.trim();

  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as {
      error?: {
        code?: number;
        message?: string;
        status?: string;
        details?: Array<{
          [key: string]: unknown;
          retryDelay?: string;
        }>;
      };
    };

    return parsed.error ?? null;
  } catch {
    return null;
  }
}

function normalizeWorkerError(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : "Unknown worker error";
  const providerError = extractProviderError(rawMessage);

  const statusCode = typeof providerError?.code === "number" ? providerError.code : undefined;
  const providerStatus = providerError?.status;
  const providerMessage = providerError?.message?.trim();

  const retryDelayFromDetails = providerError?.details?.find((item) => typeof item.retryDelay === "string")?.retryDelay;
  const retryDelayFromText = rawMessage.match(/retry in\s+([0-9.]+)s/i)?.[1];

  const retryAfterMs =
    parseRetryDelayToMs(retryDelayFromDetails) ?? parseRetryDelayToMs(retryDelayFromText ?? undefined);

  const retryableStatusCodes = new Set([429, 500, 502, 503, 504]);
  const retryable =
    (statusCode !== undefined && retryableStatusCodes.has(statusCode)) ||
    providerStatus === "RESOURCE_EXHAUSTED" ||
    providerStatus === "UNAVAILABLE" ||
    /RESOURCE_EXHAUSTED|UNAVAILABLE|timeout|timed out|ECONNRESET|ETIMEDOUT/i.test(rawMessage);

  const baseMessage = providerMessage || rawMessage;

  if (statusCode === 429) {
    const suffix = retryAfterMs ? ` Retry in ${Math.ceil(retryAfterMs / 1000)}s.` : "";
    return {
      message: `Gemini quota exceeded (429).${suffix}`,
      retryable,
      retryAfterMs,
    };
  }

  if (statusCode === 503 || providerStatus === "UNAVAILABLE") {
    const suffix = retryAfterMs ? ` Retry in ${Math.ceil(retryAfterMs / 1000)}s.` : "";
    return {
      message: `Gemini service unavailable (503).${suffix}`,
      retryable,
      retryAfterMs,
    };
  }

  return {
    message: baseMessage,
    retryable,
    retryAfterMs,
  };
}

async function run() {
  startHealthServer();

  console.log(`[worker] started id=${config.workerId} poll=${config.pollIntervalMs}ms`);
  await generationService.reconcileStuckGenerations();

  while (true) {
    lastHeartbeat = Date.now();

    const job = await jobRepository.claimNext(config.workerId);

    if (!job) {
      await sleep(config.pollIntervalMs);
      continue;
    }

    try {
      console.log(`[worker] processing job ${job.id} (${job.type})`);
      await processor.process({
        id: job.id,
        type: job.type,
        payloadJson: job.payloadJson,
      });

      await jobRepository.complete(job.id, {
        completedAt: new Date().toISOString(),
      });

      console.log(`[worker] completed job ${job.id}`);
    } catch (error) {
      const normalizedError = normalizeWorkerError(error);
      const attemptsAfterFailure = job.attempts + 1;
      const maxAttempts = resolveMaxAttemptsForJob(job, config.maxAttempts);

      const shouldRetry = normalizedError.retryable && attemptsAfterFailure < maxAttempts;
      const retryAt = shouldRetry
        ? normalizedError.retryAfterMs
          ? new Date(Date.now() + normalizedError.retryAfterMs)
          : jobService.nextRetryDate(attemptsAfterFailure)
        : undefined;

      await jobRepository.fail(job.id, normalizedError.message, shouldRetry, retryAt);

      if (!shouldRetry && job.type === "generate_recreation" && job.generationId) {
        await generationService.markFailed(job.generationId, normalizedError.message);
      }

      console.error(`[worker] failed job ${job.id}: ${normalizedError.message}`);
    }
  }
}

run()
  .catch(async (error) => {
    console.error("[worker] fatal error", error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
