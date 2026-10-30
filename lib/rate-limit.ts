import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type RateLimitAction = "waitlist" | "feedback" | "admin-login" | "admin-read";

/** PRD 8.2 */
export const RATE_LIMITS: Record<
  RateLimitAction,
  { limit: number; windowSeconds: number }
> = {
  waitlist: { limit: 5, windowSeconds: 60 * 60 },
  feedback: { limit: 3, windowSeconds: 10 * 60 },
  "admin-login": { limit: 5, windowSeconds: 15 * 60 },
  "admin-read": { limit: 60, windowSeconds: 60 },
};

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limit check failed");
    this.name = "RateLimitUnavailableError";
  }
}

/** First address in x-forwarded-for (set by Vercel), falling back to x-real-ip. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** SHA-256(ip + salt) as hex. The raw IP is never stored. */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(ip + salt);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function rateLimitKey(action: RateLimitAction, hash: string): string {
  return `${action}:${hash}`;
}

type RpcClient = Pick<SupabaseClient<Database>, "rpc">;

/**
 * Atomically counts this request against the fixed window in Postgres.
 * Throws RateLimitUnavailableError when the check cannot be made, so callers fail closed (503).
 */
export async function checkRateLimit(
  client: RpcClient,
  action: RateLimitAction,
  ip: string,
  salt: string,
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = RATE_LIMITS[action];
  const key = rateLimitKey(action, await hashIp(ip, salt));

  let response;
  try {
    response = await client.rpc("check_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
  } catch {
    throw new RateLimitUnavailableError();
  }
  const row = Array.isArray(response.data) ? response.data[0] : undefined;
  if (response.error || !row || typeof row.allowed !== "boolean") {
    throw new RateLimitUnavailableError();
  }
  return { allowed: row.allowed, retryAfterSeconds: row.retry_after_seconds ?? 0 };
}

/** "3 minutes" style text for 429 messages. */
export function formatRetryMinutes(retryAfterSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}
