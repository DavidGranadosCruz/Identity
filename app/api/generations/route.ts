import { NextRequest } from "next/server";
import { ok, fail } from "@/app/api/_utils";
import { createGenerationSchema } from "@/lib/validation/forms";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { GenerationService } from "@/server/services/generation-service";

const generationService = new GenerationService();

export async function GET() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const bundles = await generationService.listByUser(userId);
    return ok({ bundles });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const payload = createGenerationSchema.parse(await request.json());

    const result = await generationService.createGeneration(userId, payload);
    return ok(result, 201);
  } catch (error) {
    return fail(error);
  }
}
