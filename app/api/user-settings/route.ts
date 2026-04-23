import { NextRequest } from "next/server";
import { ok, fail } from "@/app/api/_utils";
import { patchUserSettingsSchema } from "@/lib/validation/forms";
import { getCurrentUserIdOrThrow } from "@/server/services/auth-context-service";
import { SettingsService } from "@/server/services/settings-service";

const settingsService = new SettingsService();

export async function GET() {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const settings = await settingsService.getByUser(userId);
    return ok({ settings });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getCurrentUserIdOrThrow();
    const payload = patchUserSettingsSchema.parse(await request.json());

    const settings = await settingsService.update(userId, payload);
    return ok({ settings });
  } catch (error) {
    return fail(error);
  }
}
