import { NextResponse } from "next/server";
import { Jimp } from "jimp";
import { fail } from "@/app/api/_utils";
import { readFromStorage } from "@/lib/storage/storage-service";
import { AppError } from "@/lib/utils/errors";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { GenerationService } from "@/server/services/generation-service";

const generationService = new GenerationService();

type DownloadFormat = "jpg" | "png" | "bmp";

function resolveTargetFormat(input: string | null): DownloadFormat {
  if (input === "png" || input === "bmp") return input;
  return "jpg";
}

function formatToMimeType(format: DownloadFormat) {
  if (format === "png") return "image/png";
  if (format === "bmp") return "image/bmp";
  return "image/jpeg";
}

function formatToExtension(format: DownloadFormat) {
  if (format === "png") return "png";
  if (format === "bmp") return "bmp";
  return "jpg";
}

async function ensureFormatBuffer(params: {
  sourceBuffer: Buffer;
  sourceMimeType: string;
  targetFormat: DownloadFormat;
}) {
  const targetMimeType = formatToMimeType(params.targetFormat);
  if (params.sourceMimeType === targetMimeType) {
    return params.sourceBuffer;
  }

  try {
    const image = await Jimp.read(params.sourceBuffer);
    return image.getBuffer(targetMimeType);
  } catch (error) {
    throw new AppError("VARIANT_CONVERSION_FAILED", "No se pudo convertir la imagen al formato solicitado", 422, error);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const { id, variantId } = await params;

    const bundle = await generationService.getById(userId, id);
    const variant = bundle.variants.find((item) => item.id === variantId);

    if (!variant) {
      return NextResponse.json(
        { data: null, error: { code: "VARIANT_NOT_FOUND", message: "Variante no encontrada" } },
        { status: 404 },
      );
    }

    const requestUrl = new URL(request.url);
    const targetFormat = resolveTargetFormat(requestUrl.searchParams.get("format"));

    const sourceFile = await readFromStorage({
      bucket: "generations",
      storagePath: variant.storagePath,
    });

    const outputBuffer = await ensureFormatBuffer({
      sourceBuffer: sourceFile.body,
      sourceMimeType: sourceFile.contentType,
      targetFormat,
    });

    const extension = formatToExtension(targetFormat);
    const fileName = `${bundle.generation.id}-${variant.variantType}.${extension}`;

    return new NextResponse(new Uint8Array(outputBuffer), {
      headers: {
        "Content-Type": formatToMimeType(targetFormat),
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return fail(error);
  }
}
