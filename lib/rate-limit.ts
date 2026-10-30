import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type RateLimitAction =
  | "feedback"
  | "admin-login"
  | "admin-read"
  | "signup"
  | "login"
  | "forgot-password"
  | "demo-login"
  | "app-write"
  | "delete-account";

/** PRD 8.2 and PRD-app section 8 */
export const RATE_LIMITS: Record<
  RateLimitAction,
  { limit: number; windowSeconds: number }
> = {
  feedback: { limit: 3, windowSeconds: 10 * 60 },
  "admin-login": { limit: 5, windowSeconds: 15 * 60 },
  "admin-read": { limit: 60, windowSeconds: 60 },
  signup: { limit: 5, windowSeconds: 60 * 60 },
  login: { limit: 10, windowSeconds: 15 * 60 },
  "forgot-password": { limit: 3, windowSeconds: 60 * 60 },
  "demo-login": { limit: 20, windowSeconds: 60 * 60 },
  "app-write": { limit: 120, windowSeconds: 60 },
  "delete-account": { limit: 3, windowSeconds: 60 * 60 },
};

/**
 * Identifier for actions by a signed-in user: keyed on the user id rather than the
 * IP, so people sharing a network (gym Wi-Fi) do not block each other.
 */
export function userIdentifier(userId: string): string {
  return `user:${userId}`;
}

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

/** SHA-256(identifier + salt) as hex. The raw IP or user id is never stored. */
export async function hashIp(identifier: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(identifier + salt);
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
 * `identifier` is the client IP, or userIdentifier(id) for signed-in actions.
 * Throws RateLimitUnavailableError when the check cannot be made, so callers fail closed (503).
 */
export async function checkRateLimit(
  client: RpcClient,
  action: RateLimitAction,
  identifier: string,
  salt: string,
): Promise<RateLimitResult> {
  const { limit, windowSeconds } = RATE_LIMITS[action];
  const key = rateLimitKey(action, await hashIp(identifier, salt));

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
