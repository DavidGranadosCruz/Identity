import { Jimp } from "jimp";
import { AppError } from "@/lib/utils/errors";

export interface DecodedImageData {
  width: number;
  height: number;
  rgba: Uint8Array;
  rgb: Int32Array;
  gray: Float32Array;
  alphaRatio: number;
}

function toLuminance(red: number, green: number, blue: number) {
  return red * 0.299 + green * 0.587 + blue * 0.114;
}

export async function decodeImageBuffer(params: { buffer: Buffer; mimeType: string }): Promise<DecodedImageData> {
  let image: Awaited<ReturnType<typeof Jimp.read>> | null = null;

  try {
    image = await Jimp.read(params.buffer);
  } catch (error) {
    throw new AppError(
      "UNSUPPORTED_IMAGE_FORMAT",
      `No se pudo decodificar la imagen (${params.mimeType}). Usa un formato compatible (JPG, PNG, WEBP, GIF, BMP, TIFF).`,
      422,
      error,
    );
  }

  const { width, height, data } = image.bitmap;
  if (!width || !height) {
    throw new AppError("INVALID_IMAGE_DIMENSIONS", "No se pudieron leer dimensiones validas de la imagen", 422);
  }

  const rgba = new Uint8Array(data);
  const rgb = new Int32Array(width * height * 3);
  const gray = new Float32Array(width * height);

  let transparentPixels = 0;

  for (let sourceIndex = 0, rgbIndex = 0, grayIndex = 0; sourceIndex < rgba.length; sourceIndex += 4) {
    const red = rgba[sourceIndex] ?? 0;
    const green = rgba[sourceIndex + 1] ?? 0;
    const blue = rgba[sourceIndex + 2] ?? 0;
    const alpha = rgba[sourceIndex + 3] ?? 255;

    rgb[rgbIndex] = red;
    rgb[rgbIndex + 1] = green;
    rgb[rgbIndex + 2] = blue;

    gray[grayIndex] = toLuminance(red, green, blue);

    if (alpha < 245) {
      transparentPixels += 1;
    }

    rgbIndex += 3;
    grayIndex += 1;
  }

  const alphaRatio = width * height > 0 ? transparentPixels / (width * height) : 0;

  return {
    width,
    height,
    rgba,
    rgb,
    gray,
    alphaRatio,
  };
}

export function sampleGrayMatrix(input: {
  gray: Float32Array;
  width: number;
  height: number;
  targetWidth: number;
  targetHeight: number;
}) {
  const target = new Float32Array(input.targetWidth * input.targetHeight);

  for (let y = 0; y < input.targetHeight; y += 1) {
    const sourceY = Math.min(input.height - 1, Math.floor((y / input.targetHeight) * input.height));

    for (let x = 0; x < input.targetWidth; x += 1) {
      const sourceX = Math.min(input.width - 1, Math.floor((x / input.targetWidth) * input.width));
      target[y * input.targetWidth + x] = input.gray[sourceY * input.width + sourceX] ?? 0;
    }
  }

  return target;
}
