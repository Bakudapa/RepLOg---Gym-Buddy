import "server-only";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/** Below this the counter is hidden: a tiny number is not social proof (FR11). */
export const MIN_SETS_TO_SHOW = 100;

/**
 * Total sets logged by real (non-demo) users, via the anon-callable RPC. Returns
 * null on failure or when below the threshold, so the page renders without it.
 */
export async function getTotalSetsLogged(): Promise<number | null> {
  try {
    const { data, error } = await createSupabasePublicClient().rpc(
      "get_total_sets_logged",
    );
    if (error || data === null || data === undefined) return null;
    const count = Number(data);
    return Number.isFinite(count) && count >= MIN_SETS_TO_SHOW ? count : null;
  } catch {
    return null;
  }
}
