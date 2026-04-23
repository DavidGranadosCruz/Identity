import { NextResponse } from "next/server";
import { fail } from "@/app/api/_utils";
import { prisma } from "@/lib/db/prisma";
import { readFromStorage, type StorageBucket } from "@/lib/storage/storage-service";
import { AppError } from "@/lib/utils/errors";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";

function decodeStoragePath(parts: string[]) {
  return parts.map((part) => decodeURIComponent(part)).join("/");
}

function assertBucket(bucket: string): StorageBucket {
  if (bucket === "uploads" || bucket === "generations") {
    return bucket;
  }

  throw new AppError("INVALID_BUCKET", "Invalid storage bucket", 404);
}

async function assertUploadOwnership(userId: string, storagePath: string) {
  const [identityImage, referenceImage] = await Promise.all([
    prisma.identityPackImage.findFirst({
      where: {
        storagePath,
        pack: {
          userId,
        },
      },
      select: { id: true },
    }),
    prisma.referenceImage.findFirst({
      where: {
        storagePath,
        userId,
      },
      select: { id: true },
    }),
  ]);

  if (!identityImage && !referenceImage) {
    throw new AppError("FILE_NOT_FOUND", "Image not found", 404);
  }
}

async function assertGenerationOwnership(userId: string, storagePath: string) {
  const variant = await prisma.generationVariant.findFirst({
    where: {
      storagePath,
      generation: {
        userId,
      },
    },
    select: { id: true },
  });

  if (!variant) {
    throw new AppError("FILE_NOT_FOUND", "Image not found", 404);
  }
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ bucket: string; storagePath: string[] }> },
) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const parsedParams = await params;

    const bucket = assertBucket(parsedParams.bucket);
    const storagePathParts = parsedParams.storagePath ?? [];

    if (!storagePathParts.length) {
      throw new AppError("INVALID_STORAGE_PATH", "Missing storage path", 422);
    }

    const storagePath = decodeStoragePath(storagePathParts);

    if (bucket === "uploads") {
      await assertUploadOwnership(userId, storagePath);
    } else {
      await assertGenerationOwnership(userId, storagePath);
    }

    const file = await readFromStorage({
      bucket,
      storagePath,
    });

    return new NextResponse(new Uint8Array(file.body), {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=120",
      },
    });
  } catch (error) {
    return fail(error);
  }
}

