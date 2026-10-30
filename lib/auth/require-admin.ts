import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export type RequireAdminResult =
  | { ok: true; user: User; supabase: Client }
  | { ok: false; status: 401 | 403; supabase: Client | null };

/**
 * Server-side authorization for everything under /admin (FR15):
 *  1. Is someone signed in? Otherwise 401.
 *  2. Is that user in public.admins? Otherwise 403.
 * The returned client acts as the user, so RLS still applies to every query.
 */
export async function requireAdmin(
  createClient: () => Promise<Client> = createSupabaseServerClient,
): Promise<RequireAdminResult> {
  let supabase: Client;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, status: 401, supabase: null };
  }

  // getUser() asks Supabase Auth to validate the token; the cookie alone is not trusted.
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return { ok: false, status: 401, supabase };

  const { data: adminRow, error: adminError } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Fail closed: a lookup error is treated as "not an admin".
  if (adminError || !adminRow) return { ok: false, status: 403, supabase };

  return { ok: true, user, supabase };
}
