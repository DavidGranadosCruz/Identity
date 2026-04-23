import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { AppError } from "@/lib/utils/errors";

export async function getCurrentUserIdOrThrow() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new AppError("UNAUTHORIZED", "Debes iniciar sesión para continuar", 401);
  }

  return userId;
}

export async function requireDashboardUserId() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/login");
  }

  return userId;
}

export async function getCurrentUserSession() {
  return auth();
}

