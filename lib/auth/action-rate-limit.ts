import "server-only";
import { getServerEnv } from "@/lib/env.server";
import {
  checkRateLimit,
  formatRetryMinutes,
  type RateLimitAction,
} from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export type ActionRateLimit =
  | { ok: true }
  | { ok: false; status: 429 | 503; retryAfterSeconds?: number; message: string };

/**
 * Rate limit for Server Actions, which have no Request object. Fails closed (PRD 8.5).
 * `identifier` is the client IP or userIdentifier(userId).
 */
export async function limitAction(
  action: RateLimitAction,
  identifier: string,
): Promise<ActionRateLimit> {
  try {
    const { RATE_LIMIT_SALT } = getServerEnv();
    const result = await checkRateLimit(
      createSupabaseServiceClient(),
      action,
      identifier,
      RATE_LIMIT_SALT,
    );
    if (result.allowed) return { ok: true };
    return {
      ok: false,
      status: 429,
      retryAfterSeconds: result.retryAfterSeconds,
      message: `Too many attempts. Please try again in ${formatRetryMinutes(result.retryAfterSeconds)}.`,
    };
  } catch {
    return {
      ok: false,
      status: 503,
      message: "This is temporarily unavailable. Please try again later.",
    };
  }
}
