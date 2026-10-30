import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { toLoggedSet } from "./rows";
import { lastSetByExercise, recentExerciseNames, type LoggedSet } from "./sets";

type Client = SupabaseClient<Database>;

/**
 * Read helpers for /app. Every query runs with the user's own session, so RLS
 * limits results to their rows; another user's id simply returns nothing (→ 404).
 */

export async function getActiveSession(supabase: Client) {
  const { data } = await supabase
    .from("workout_sessions")
    .select("id, name, started_at")
    .is("ended_at", null)
    .maybeSingle();
  return data;
}

export async function getSession(supabase: Client, id: string) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Could not load the workout.");
  return data;
}

/** Sets of one session with PR flags from the records view. */
export async function getSessionSets(
  supabase: Client,
  sessionId: string,
): Promise<LoggedSet[]> {
  const { data, error } = await supabase
    .from("workout_set_records")
    .select("*")
    .eq("session_id", sessionId)
    .order("performed_at", { ascending: true });
  if (error) throw new Error("Could not load sets.");
  return (data ?? []).map(toLoggedSet);
}

/** Recent sets from earlier workouts: combobox suggestions and pre-fill values (FR24). */
export async function getLoggingHints(supabase: Client, excludeSessionId: string) {
  const { data } = await supabase
    .from("workout_sets")
    .select("*")
    .neq("session_id", excludeSessionId)
    .order("performed_at", { ascending: false })
    .limit(500);
  const sets = (data ?? []).map(toLoggedSet);
  return { lastByExercise: lastSetByExercise(sets), recent: recentExerciseNames(sets) };
}

/** Everything the dashboard needs (FR22), loaded in parallel. */
export async function getDashboardData(supabase: Client) {
  const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const [active, week, records, recentSessions, total] = await Promise.all([
    supabase
      .from("workout_session_summaries")
      .select("id, name, started_at, set_count")
      .is("ended_at", null)
      .maybeSingle(),
    // A bit more than a week; the browser applies the exact Monday in its own time zone.
    supabase
      .from("workout_session_summaries")
      .select("started_at, set_count, volume_kg")
      .not("ended_at", "is", null)
      .gte("started_at", eightDaysAgo),
    supabase
      .from("workout_set_records")
      .select("*")
      .or("is_e1rm_pr.eq.true,is_weight_pr.eq.true")
      .order("performed_at", { ascending: false })
      .limit(5),
    supabase
      .from("workout_session_summaries")
      .select("id, name, started_at, ended_at, set_count, volume_kg")
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(3),
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }),
  ]);
  if (week.error || records.error || recentSessions.error)
    throw new Error("Could not load the dashboard.");

  return {
    active: active.data,
    week: (week.data ?? []).map((row) => ({
      startedAt: row.started_at,
      setCount: row.set_count,
      volumeKg: Number(row.volume_kg),
    })),
    records: (records.data ?? []).map(toLoggedSet),
    recentSessions: recentSessions.data ?? [],
    isNewUser: (total.count ?? 0) === 0,
  };
}
