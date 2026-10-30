import "server-only";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Waitlist size via the anon-callable RPC. Returns null on any failure so the
 * page renders without the counter instead of erroring (FR11).
 */
export async function getWaitlistCount(): Promise<number | null> {
  try {
    const { data, error } = await createSupabasePublicClient().rpc("get_waitlist_count");
    if (error || data === null || data === undefined) return null;
    const count = Number(data);
    return Number.isFinite(count) && count >= 0 ? count : null;
  } catch {
    return null;
  }
}
