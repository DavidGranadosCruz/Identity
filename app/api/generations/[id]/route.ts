import { ok, fail } from "@/app/api/_utils";
import { patchGenerationSchema } from "@/lib/validation/forms";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { GenerationService } from "@/server/services/generation-service";

const generationService = new GenerationService();

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const { id } = await params;

    const bundle = await generationService.getById(userId, id);
    return ok({ bundle });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const { id } = await params;
    const payload = patchGenerationSchema.parse(await request.json());

    const generation = await generationService.updateTitle(userId, id, payload.title);
    return ok({ generation });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const { id } = await params;

    const result = await generationService.deleteGeneration(userId, id);
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
