import { PrismaClient } from "@prisma/client";

declare global {
  var __identityPrisma: PrismaClient | undefined;
}

export const prisma =
  global.__identityPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__identityPrisma = prisma;
}

