import { NextResponse } from "next/server";
import { toErrorPayload } from "@/lib/utils/errors";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(error: unknown) {
  const payload = toErrorPayload(error);
  return NextResponse.json(
    {
      data: null,
      error: {
        code: payload.code,
        message: payload.message,
        details: payload.details,
      },
    },
    { status: payload.statusCode },
  );
}



