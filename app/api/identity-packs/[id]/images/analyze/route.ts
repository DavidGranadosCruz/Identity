import { NextRequest } from "next/server";
import { ok, fail } from "@/app/api/_utils";
import { analyzeIdentityPackSchema } from "@/lib/validation/forms";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { IdentityPackService } from "@/server/services/identity-pack-service";

const identityPackService = new IdentityPackService();

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const { id } = await params;
    const payload = analyzeIdentityPackSchema.parse(await request.json());

    const result = await identityPackService.requeueAnalysis({
      userId,
      packId: id,
      imageIds: payload.imageIds,
    });

    return ok(result);
  } catch (error) {
    return fail(error);
  }
}
