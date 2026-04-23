import { describe, expect, it } from "vitest";
import { getGeminiClient, resetGeminiClientForTests } from "@/lib/ai/providers/gemini-client";
import { resetEnvCacheForTests } from "@/lib/utils/env";

describe("Gemini config", () => {
  it("fails with explicit message when GEMINI_API_KEY is missing", () => {
    const previous = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    resetEnvCacheForTests();
    resetGeminiClientForTests();

    expect(() => getGeminiClient()).toThrowError(/GEMINI_API_KEY/);

    process.env.GEMINI_API_KEY = previous;
    resetEnvCacheForTests();
    resetGeminiClientForTests();
  });
});
