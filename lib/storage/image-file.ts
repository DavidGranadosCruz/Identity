import { imageSize } from "image-size";
import { uploadLimits } from "@/lib/validation/files";
import { AppError } from "@/lib/utils/errors";

export interface UploadedImage {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
}

function resolveMimeType(file: File) {
  return file.type && file.type.length > 0 && file.type.startsWith("image/") ? file.type : "";
}

function assertImageMimeType(mimeType: string) {
  if (!mimeType.startsWith("image/")) {
    throw new AppError("INVALID_FILE_TYPE", `Only image files are allowed. Received: ${mimeType}`, 422);
  }
}

function mimeTypeFromFilename(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) return null;

  if (["jpg", "jpeg", "jfif"].includes(extension)) return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "bmp") return "image/bmp";
  if (["tif", "tiff"].includes(extension)) return "image/tiff";
  if (extension === "avif") return "image/avif";
  if (extension === "heic") return "image/heic";
  if (extension === "heif") return "image/heif";

  return null;
}

function mimeTypeFromBuffer(buffer: Buffer) {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (buffer.subarray(0, 3).toString("ascii") === "GIF") {
    return "image/gif";
  }

  if (buffer.subarray(0, 2).toString("ascii") === "BM") {
    return "image/bmp";
  }

  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  if (
    (buffer[0] === 0x49 && buffer[1] === 0x49 && buffer[2] === 0x2a && buffer[3] === 0x00) ||
    (buffer[0] === 0x4d && buffer[1] === 0x4d && buffer[2] === 0x00 && buffer[3] === 0x2a)
  ) {
    return "image/tiff";
  }

  const boxType = buffer.subarray(4, 8).toString("ascii");
  const majorBrand = buffer.subarray(8, 12).toString("ascii");
  if (boxType === "ftyp") {
    if (majorBrand.startsWith("avif")) return "image/avif";
    if (majorBrand.startsWith("heic")) return "image/heic";
    if (majorBrand.startsWith("heif")) return "image/heif";
  }

  return null;
}

function resolveDimensions(buffer: Buffer) {
  try {
    const dimensions = imageSize(buffer);
    return {
      width: dimensions.width ?? 0,
      height: dimensions.height ?? 0,
    };
  } catch {
    return {
      width: 0,
      height: 0,
    };
  }
}

export async function parseUploadedImage(file: File): Promise<UploadedImage> {
  if (file.size < uploadLimits.minFileSizeBytes || file.size > uploadLimits.maxFileSizeBytes) {
    throw new AppError("INVALID_FILE_SIZE", "File size is outside allowed limits", 422, {
      min: uploadLimits.minFileSizeBytes,
      max: uploadLimits.maxFileSizeBytes,
      received: file.size,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dimensions = resolveDimensions(buffer);
  const mimeType =
    resolveMimeType(file) ||
    mimeTypeFromFilename(file.name) ||
    mimeTypeFromBuffer(buffer) ||
    (dimensions.width > 0 && dimensions.height > 0 ? "image/png" : "application/octet-stream");

  assertImageMimeType(mimeType);

  return {
    buffer,
    originalFilename: file.name,
    mimeType,
    width: dimensions.width,
    height: dimensions.height,
    fileSize: file.size,
  };
}
