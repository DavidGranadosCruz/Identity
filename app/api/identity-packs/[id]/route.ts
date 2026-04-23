import { NextRequest } from "next/server";
import { ok, fail } from "@/app/api/_utils";
import { renameIdentityPackSchema } from "@/lib/validation/forms";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { IdentityPackService } from "@/server/services/identity-pack-service";

const identityPackService = new IdentityPackService();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const { id } = await params;
    const payload = renameIdentityPackSchema.parse(await request.json());

    const pack = await identityPackService.renamePack({
      userId,
      packId: id,
      name: payload.name,
    });

    return ok({ pack });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const { id } = await params;
    const result = await identityPackService.deletePack({
      userId,
      packId: id,
    });
    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
