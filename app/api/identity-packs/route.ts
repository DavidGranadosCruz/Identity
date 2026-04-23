import { NextRequest } from "next/server";
import { ok, fail } from "@/app/api/_utils";
import { parseUploadedImage } from "@/lib/storage/image-file";
import { createIdentityPackSchema } from "@/lib/validation/forms";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { IdentityPackService } from "@/server/services/identity-pack-service";

const identityPackService = new IdentityPackService();

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const packId = request.nextUrl.searchParams.get("packId");
    const workspace = await identityPackService.getPackWorkspace(userId, packId);
    return ok(workspace);
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await request.json();
      const payload = createIdentityPackSchema.parse({
        name: body?.name ?? "My Identity Pack",
      });
      const pack = await identityPackService.createPack({
        userId,
        name: payload.name,
      });
      return ok({ pack }, 201);
    }

    const formData = await request.formData();
    const name = String(formData.get("name") ?? "My Identity Pack");
    const packId = formData.get("packId") ? String(formData.get("packId")) : undefined;
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    const payload = createIdentityPackSchema.parse({ name, packId });
    const uploaded = await Promise.all(files.map(parseUploadedImage));

    const result = await identityPackService.uploadImages({
      userId,
      name: payload.name,
      packId: payload.packId,
      files: uploaded,
    });

    return ok(result, 201);
  } catch (error) {
    return fail(error);
  }
}
