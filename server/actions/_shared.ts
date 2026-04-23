import { z } from "zod";
import { AppError } from "@/lib/utils/errors";

export function parsePayload<T>(schema: z.ZodSchema<T>, payload: unknown): T {
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const fieldPath = firstIssue?.path?.length ? firstIssue.path.join(".") : null;
    const message = fieldPath
      ? `Validation failed at '${fieldPath}': ${firstIssue.message}`
      : "Payload validation failed";

    throw new AppError("VALIDATION_ERROR", message, 422, parsed.error.issues);
  }

  return parsed.data;
}
