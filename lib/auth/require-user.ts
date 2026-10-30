import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Client = SupabaseClient<Database>;

export type UserProfile = { displayName: string; isDemo: boolean };

export type RequireUserResult =
  | { ok: true; user: User; profile: UserProfile; supabase: Client }
  | { ok: false; status: 401; supabase: Client | null };

/**
 * Server-side session check for /app (FR21). Every Server Action and page calls this
 * itself instead of trusting the proxy. The returned client acts as the user, so RLS
 * applies to every query.
 */
export async function requireUser(
  createClient: () => Promise<Client> = createSupabaseServerClient,
): Promise<RequireUserResult> {
  let supabase: Client;
  try {
    supabase = await createClient();
  } catch {
    return { ok: false, status: 401, supabase: null };
  }

  // getUser() validates the token with Supabase Auth; the cookie alone is not trusted.
  const { data, error } = await supabase.auth.getUser();
  const user = data?.user;
  if (error || !user) return { ok: false, status: 401, supabase };

  const { data: row } = await supabase
    .from("profiles")
    .select("display_name, is_demo")
    .eq("id", user.id)
    .maybeSingle();

  const profile: UserProfile = {
    displayName: row?.display_name ?? user.email?.split("@")[0] ?? "Lifter",
    // RLS blocks demo writes regardless; this flag only drives the UI.
    isDemo: row?.is_demo ?? false,
  };

  return { ok: true, user, profile, supabase };
}
