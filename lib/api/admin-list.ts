import "server-only";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerEnv } from "@/lib/env.server";
import { errorResponse, rateLimitedResponse } from "@/lib/http";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  adminListQuerySchema,
  fieldErrors,
  type AdminListQuery,
} from "@/lib/validation/schemas";
import type { RequireAdminResult } from "@/lib/auth/require-admin";

export const PAGE_SIZE = 20;

type Authorized = Extract<RequireAdminResult, { ok: true }>;

/**
 * Shared checks for GET /api/admin/*: rate limit → authentication (401) →
 * authorization (403) → query validation (400).
 */
export async function handleAdminListRequest(
  request: Request,
): Promise<
  | { ok: true; admin: Authorized; query: AdminListQuery }
  | { ok: false; response: Response }
> {
  try {
    const { RATE_LIMIT_SALT } = getServerEnv();
    const limit = await checkRateLimit(
      createSupabaseServiceClient(),
      "admin-read",
      getClientIp(request.headers),
      RATE_LIMIT_SALT,
    );
    if (!limit.allowed)
      return { ok: false, response: rateLimitedResponse(limit.retryAfterSeconds) };
  } catch {
    return { ok: false, response: errorResponse("SERVICE_UNAVAILABLE") };
  }

  const admin = await requireAdmin();
  if (!admin.ok) {
    return {
      ok: false,
      response: errorResponse(admin.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN"),
    };
  }

  const params = new URL(request.url).searchParams;
  const parsed = adminListQuerySchema.safeParse({
    page: params.get("page") ?? undefined,
    category: params.get("category") || undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      response: errorResponse("VALIDATION_ERROR", { fields: fieldErrors(parsed.error) }),
    };
  }

  return { ok: true, admin, query: parsed.data };
}

export function pageRange(page: number) {
  const from = (page - 1) * PAGE_SIZE;
  return { from, to: from + PAGE_SIZE - 1 };
}
