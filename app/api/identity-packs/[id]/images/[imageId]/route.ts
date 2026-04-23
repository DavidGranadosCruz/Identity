import { ok, fail } from "@/app/api/_utils";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { IdentityPackService } from "@/server/services/identity-pack-service";

const identityPackService = new IdentityPackService();

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; imageId: string }> },
) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const { id, imageId } = await params;

    const result = await identityPackService.deleteImage({
      userId,
      packId: id,
      imageId,
    });

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}