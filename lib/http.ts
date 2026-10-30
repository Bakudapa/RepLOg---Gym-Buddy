import type { FieldErrors } from "@/lib/validation/schemas";

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "ALREADY_REGISTERED"
  | "RATE_LIMITED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ErrorBody = {
  error: { code: ErrorCode; message: string; fields?: FieldErrors };
};

const defaultMessages: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "Some fields are invalid.",
  ALREADY_REGISTERED: "You're already on the list.",
  RATE_LIMITED: "Too many requests. Please try again later.",
  UNAUTHORIZED: "You need to sign in.",
  FORBIDDEN: "You don't have access to this resource.",
  UNSUPPORTED_MEDIA_TYPE: "Content-Type must be application/json.",
  PAYLOAD_TOO_LARGE: "Request body is too large.",
  SERVICE_UNAVAILABLE: "Service temporarily unavailable. Please try again.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
};

const statusFor: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  ALREADY_REGISTERED: 409,
  RATE_LIMITED: 429,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  UNSUPPORTED_MEDIA_TYPE: 415,
  PAYLOAD_TOO_LARGE: 413,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
};

const noStore = { "Cache-Control": "no-store" };

/** Standard error response (PRD 9.1). Never include internal details in `message`. */
export function errorResponse(
  code: ErrorCode,
  options: { message?: string; fields?: FieldErrors; headers?: HeadersInit } = {},
): Response {
  const body: ErrorBody = {
    error: {
      code,
      message: options.message ?? defaultMessages[code],
      ...(options.fields ? { fields: options.fields } : {}),
    },
  };
  const headers = new Headers(options.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { status: statusFor[code], headers });
}

export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: noStore });
}

export function rateLimitedResponse(retryAfterSeconds: number): Response {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  return errorResponse("RATE_LIMITED", { headers: { "Retry-After": String(seconds) } });
}

export const MAX_BODY_BYTES = 10 * 1024;

export function isJsonContentType(request: Request): boolean {
  const type = request.headers.get("content-type") ?? "";
  return type.split(";")[0].trim().toLowerCase() === "application/json";
}

/**
 * Reads the body as text, stopping as soon as it exceeds `maxBytes` so a huge
 * body is never buffered in full. Returns null when the limit is exceeded.
 */
export async function readBodyWithLimit(
  request: Request,
  maxBytes: number = MAX_BODY_BYTES,
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Parses JSON, returning undefined on failure (caller answers 400). */
export function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}
