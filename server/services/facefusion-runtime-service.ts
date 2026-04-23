import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { AppError } from "@/lib/utils/errors";
import { getEnv } from "@/lib/utils/env";

type VariantType = "faithful" | "editorial" | "cinematic";

interface RuntimeImageInput {
  id: string;
  buffer: Buffer;
  mimeType: string;
}

interface GenerateVariantInput {
  generationId: string;
  variantType: VariantType;
  attempt: number;
  referenceImage: {
    buffer: Buffer;
    mimeType: string;
  };
  identityImages: RuntimeImageInput[];
}

export interface FaceFusionRuntimeOutput {
  buffer: Buffer;
  mimeType: string;
  elapsedMs: number;
  stdout: string;
  stderr: string;
  command: string[];
  outputPath: string;
  processors: string[];
}

interface CommandResult {
  stdout: string;
  stderr: string;
}

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  if (mimeType.includes("gif")) return "gif";
  if (mimeType.includes("bmp")) return "bmp";
  if (mimeType.includes("tiff")) return "tiff";
  return "jpg";
}

function normalizePathForContainer(filePath: string) {
  return filePath.replace(/\\/g, "/");
}

function splitProcessorList(value: string) {
  return value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveVariantProcessors(variantType: VariantType) {
  const env = getEnv();
  if (variantType === "faithful") return splitProcessorList(env.FACEFUSION_PROCESSORS_FAITHFUL);
  if (variantType === "editorial") return splitProcessorList(env.FACEFUSION_PROCESSORS_EDITORIAL);
  return splitProcessorList(env.FACEFUSION_PROCESSORS_CINEMATIC);
}

function runCommand(command: string, args: string[], timeoutMs: number): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      process.kill("SIGKILL");
      reject(new AppError("FACEFUSION_TIMEOUT", `FaceFusion excedio el timeout de ${timeoutMs}ms`, 504));
    }, timeoutMs);

    process.stdout.on("data", (chunk) => stdoutChunks.push(String(chunk)));
    process.stderr.on("data", (chunk) => stderrChunks.push(String(chunk)));
    process.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new AppError("FACEFUSION_EXEC_ERROR", error.message, 500));
    });

    process.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);

      const stdout = stdoutChunks.join("").trim();
      const stderr = stderrChunks.join("").trim();

      if (code !== 0) {
        reject(
          new AppError("FACEFUSION_COMMAND_FAILED", "FaceFusion finalizo con error", 502, {
            code,
            stdout,
            stderr,
          }),
        );
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

export class FaceFusionRuntimeService {
  private readonly env = getEnv();

  private buildWorkDir(params: { generationId: string; variantType: VariantType; attempt: number }) {
    const token = randomUUID().slice(0, 8);
    return path.join(
      this.env.FACEFUSION_SHARED_DATA_PATH,
      "jobs",
      params.generationId,
      `${params.variantType}-attempt-${params.attempt}-${token}`,
    );
  }

  async generateVariant(input: GenerateVariantInput): Promise<FaceFusionRuntimeOutput> {
    if (!input.identityImages.length) {
      throw new AppError("IDENTITY_IMAGES_REQUIRED", "FaceFusion requiere al menos una imagen de identidad", 422);
    }

    const workDir = this.buildWorkDir({
      generationId: input.generationId,
      variantType: input.variantType,
      attempt: input.attempt,
    });

    const sourceDir = path.join(workDir, "sources");
    await fs.mkdir(sourceDir, { recursive: true });

    const targetExtension = extensionForMimeType(input.referenceImage.mimeType);
    const targetPath = path.join(workDir, `target.${targetExtension}`);
    const outputPath = path.join(workDir, "result.jpg");

    await fs.writeFile(targetPath, input.referenceImage.buffer);

    const sourcePaths: string[] = [];

    for (const [index, image] of input.identityImages.entries()) {
      const sourceExtension = extensionForMimeType(image.mimeType);
      const sourcePath = path.join(sourceDir, `${index + 1}-${image.id}.${sourceExtension}`);
      await fs.writeFile(sourcePath, image.buffer);
      sourcePaths.push(sourcePath);
    }

    const processors = resolveVariantProcessors(input.variantType);
    if (!processors.length) {
      throw new AppError("FACEFUSION_PROCESSORS_INVALID", "No hay processors configurados para FaceFusion", 500);
    }

    const command = [
      "exec",
      "-w",
      "/facefusion",
      this.env.FACEFUSION_CONTAINER_NAME,
      "python",
      "facefusion.py",
      "headless-run",
      "--source-paths",
      ...sourcePaths.map(normalizePathForContainer),
      "--target-path",
      normalizePathForContainer(targetPath),
      "--output-path",
      normalizePathForContainer(outputPath),
      "--processors",
      ...processors,
      "--execution-providers",
      this.env.FACEFUSION_EXECUTION_PROVIDERS,
      "--execution-thread-count",
      String(this.env.FACEFUSION_EXECUTION_THREAD_COUNT),
      "--output-image-quality",
      String(this.env.FACEFUSION_OUTPUT_IMAGE_QUALITY),
    ];

    const startedAt = Date.now();
    const { stdout, stderr } = await runCommand("docker", command, this.env.FACEFUSION_COMMAND_TIMEOUT_MS);
    const elapsedMs = Date.now() - startedAt;

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(outputPath);
    } catch (error) {
      throw new AppError("FACEFUSION_OUTPUT_NOT_FOUND", "FaceFusion no devolvio imagen de salida", 502, {
        outputPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!buffer.length) {
      throw new AppError("FACEFUSION_EMPTY_OUTPUT", "FaceFusion devolvio una imagen vacia", 502, {
        outputPath,
      });
    }

    if (!this.env.FACEFUSION_KEEP_ARTIFACTS) {
      await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    }

    return {
      buffer,
      mimeType: "image/jpeg",
      elapsedMs,
      stdout,
      stderr,
      command,
      outputPath,
      processors,
    };
  }
}

