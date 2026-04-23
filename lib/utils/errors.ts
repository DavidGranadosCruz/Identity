import { ZodError } from "zod";

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function toErrorPayload(error: unknown) {
  if (error instanceof ZodError) {
    return {
      code: "INVALID_PAYLOAD",
      message: "Payload invalido",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
      statusCode: 422,
    };
  }

  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      code: "INTERNAL_ERROR",
      message: error.message,
      details: null,
      statusCode: 500,
    };
  }

  return {
    code: "UNKNOWN_ERROR",
    message: "Error inesperado",
    details: error,
    statusCode: 500,
  };
}



