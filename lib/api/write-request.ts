import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";
import { getServerEnv } from "@/lib/env.server";
import {
  errorResponse,
  isJsonContentType,
  parseJson,
  rateLimitedResponse,
  readBodyWithLimit,
} from "@/lib/http";
import { checkRateLimit, getClientIp, type RateLimitAction } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { Database } from "@/lib/supabase/types";
import { fieldErrors } from "@/lib/validation/schemas";

type WriteRequestResult<T> =
  { ok: true; data: T; db: SupabaseClient<Database> } | { ok: false; response: Response };

/**
 * Checks shared by every public write endpoint, in the order of PRD 7.3:
 * 415 Content-Type → 413 size → 429 rate limit → 400 JSON → 400 validation.
 * The honeypot and the insert are left to the caller.
 */
export async function handleWriteRequest<Schema extends z.ZodType>(
  request: Request,
  options: { action: RateLimitAction; schema: Schema },
): Promise<WriteRequestResult<z.infer<Schema>>> {
  if (!isJsonContentType(request)) {
    return { ok: false, response: errorResponse("UNSUPPORTED_MEDIA_TYPE") };
  }

  const text = await readBodyWithLimit(request);
  if (text === null) {
    return { ok: false, response: errorResponse("PAYLOAD_TOO_LARGE") };
  }

  let db: SupabaseClient<Database>;
  try {
    db = createSupabaseServiceClient();
    const { RATE_LIMIT_SALT } = getServerEnv();
    const limit = await checkRateLimit(
      db,
      options.action,
      getClientIp(request.headers),
      RATE_LIMIT_SALT,
    );
    if (!limit.allowed) {
      return { ok: false, response: rateLimitedResponse(limit.retryAfterSeconds) };
    }
  } catch (error) {
    // Fail closed: writing without a rate limit is riskier than refusing (PRD 8.5).
    console.error(`[${options.action}] rate limit unavailable:`, (error as Error).name);
    return { ok: false, response: errorResponse("SERVICE_UNAVAILABLE") };
  }

  const json = parseJson(text);
  if (!json.ok) {
    return {
      ok: false,
      response: errorResponse("VALIDATION_ERROR", {
        message: "Request body must be valid JSON.",
      }),
    };
  }

  const parsed = options.schema.safeParse(json.value);
  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse("VALIDATION_ERROR", { fields: fieldErrors(parsed.error) }),
    };
  }

  return { ok: true, data: parsed.data, db };
}
