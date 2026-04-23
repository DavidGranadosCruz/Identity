import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { healthCheckStorage } from "@/lib/storage/storage-service";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await healthCheckStorage();

    return NextResponse.json({ data: { ok: true }, error: null }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "HEALTHCHECK_FAILED",
          message: error instanceof Error ? error.message : "Healthcheck failed",
        },
      },
      { status: 503 },
    );
  }
}
