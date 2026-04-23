import { GoogleGenAI } from "@google/genai";
import { AppError } from "@/lib/utils/errors";
import { getEnv } from "@/lib/utils/env";

let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient() {
  const env = getEnv();

  if (!env.GEMINI_API_KEY) {
    throw new AppError("GEMINI_MISSING_API_KEY", "GEMINI_API_KEY is not configured", 500);
  }

  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }

  return cachedClient;
}

export function getGeminiModelNames() {
  const env = getEnv();
  return {
    text: env.GEMINI_TEXT_MODEL,
    image: env.GEMINI_IMAGE_MODEL,
  };
}

export function resetGeminiClientForTests() {
  if (process.env.NODE_ENV === "test") {
    cachedClient = null;
  }
}
