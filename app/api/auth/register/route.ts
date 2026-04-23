import { hash } from "bcryptjs";
import { NextRequest } from "next/server";
import { ok, fail } from "@/app/api/_utils";
import { registerSchema } from "@/lib/validation/forms";
import { parsePayload } from "@/server/actions/_shared";
import { prisma } from "@/lib/db/prisma";
import { SettingsRepository } from "@/server/repositories/settings-repository";
import { AppError } from "@/lib/utils/errors";

const settingsRepository = new SettingsRepository();

export async function POST(request: NextRequest) {
  try {
    const payload = parsePayload(registerSchema, await request.json());

    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      throw new AppError("EMAIL_ALREADY_EXISTS", "Email is already registered", 409);
    }

    const passwordHash = await hash(payload.password, 12);

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash,
      },
    });

    await settingsRepository.createDefaults(user.id);

    return ok(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
      201,
    );
  } catch (error) {
    return fail(error);
  }
}
