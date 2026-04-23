import { AppError } from "@/lib/utils/errors";

export function parseJsonFromText<T>(text: string): T {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new AppError("INVALID_PROVIDER_JSON", "La respuesta del proveedor no es JSON válido", 502, {
      raw: text,
      cause: error,
    });
  }
}



