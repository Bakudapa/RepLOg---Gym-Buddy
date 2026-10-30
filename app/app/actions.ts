"use server";

import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { limitAction } from "@/lib/auth/action-rate-limit";
import { requireUser, type UserProfile } from "@/lib/auth/require-user";
import { userIdentifier } from "@/lib/rate-limit";
import type { Database } from "@/lib/supabase/types";
import {
  fieldErrors,
  setSchema,
  startSessionSchema,
  uuidSchema,
  type SetInput,
} from "@/lib/validation/schemas";
import { DEMO_READ_ONLY, type ActionResult } from "@/lib/workout/action-result";
import { toLoggedSet } from "@/lib/workout/rows";
import type { LoggedSet } from "@/lib/workout/sets";

type Client = SupabaseClient<Database>;
type Context = { supabase: Client; user: User; profile: UserProfile };
type Failure = Extract<ActionResult, { ok: false }>;

/**
 * Shared guard for every write in /app (FR21, PRD-app section 4):
 * session (401) → demo account (403) → rate limit per user (429/503).
 * Validation and the query follow in each action, always with the user's session.
 */
async function withWriter(): Promise<{ ok: true; ctx: Context } | Failure> {
  const session = await requireUser();
  if (!session.ok) return { ok: false, status: 401, error: "Please log in again." };
  if (session.profile.isDemo) return { ok: false, status: 403, error: DEMO_READ_ONLY };

  const limit = await limitAction("app-write", userIdentifier(session.user.id));
  if (!limit.ok) return { ok: false, status: limit.status, error: limit.message };

  return {
    ok: true,
    ctx: { supabase: session.supabase, user: session.user, profile: session.profile },
  };
}

/** Turns database errors into user-facing results without leaking details. */
function dbFailure(error: PostgrestError, scope: string): Failure {
  if (error.message === "set_limit_reached") {
    return { ok: false, status: 409, error: "A workout can have at most 100 sets." };
  }
  if (error.message === "session_limit_reached") {
    return {
      ok: false,
      status: 429,
      error: "You've started 20 workouts in the last 24 hours. Try again later.",
    };
  }
  if (error.code === "42501") return { ok: false, status: 403, error: DEMO_READ_ONLY };
  console.error(`[${scope}] failed:`, error.code);
  return { ok: false, status: 500, error: "Something went wrong. Please try again." };
}

const notFound: Failure = { ok: false, status: 404, error: "Not found." };

function revalidateWorkout(sessionId: string) {
  revalidatePath(`/app/workout/${sessionId}`);
  revalidatePath(`/app/history/${sessionId}`);
  revalidatePath("/app", "layout");
}

/** FR23: opens the active workout, or starts one. Form action from the dashboard. */
export async function startWorkout(formData: FormData): Promise<ActionResult> {
  const guard = await withWriter();
  if (!guard.ok) return guard;
  const { supabase } = guard.ctx;

  const parsed = startSessionSchema.safeParse({
    name: formData.get("name") ?? undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      status: 400,
      error: "Check the workout name.",
      fields: fieldErrors(parsed.error),
    };
  }

  const fallback = String(formData.get("defaultName") ?? "")
    .trim()
    .slice(0, 60);
  const name =
    parsed.data.name ??
    (fallback || `Workout — ${new Date().toISOString().slice(0, 10)}`);

  const active = await supabase
    .from("workout_sessions")
    .select("id")
    .is("ended_at", null)
    .maybeSingle();
  if (active.data) redirect(`/app/workout/${active.data.id}`);

  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({ name })
    .select("id")
    .single();
  if (error?.code === "23505") {
    // Another tab started one in the meantime: open that one.
    const again = await supabase
      .from("workout_sessions")
      .select("id")
      .is("ended_at", null)
      .maybeSingle();
    if (again.data) redirect(`/app/workout/${again.data.id}`);
  }
  if (error || !data) return dbFailure(error!, "start-workout");

  revalidatePath("/app", "layout");
  redirect(`/app/workout/${data.id}`);
}

function parseSet(input: unknown): { ok: true; data: SetInput } | Failure {
  const parsed = setSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    status: 400,
    error: "Check the highlighted fields.",
    fields: fieldErrors(parsed.error),
  };
}

/** FR24: adds a set to one of the user's sessions. */
export async function addSet(
  sessionId: string,
  input: SetInput,
): Promise<ActionResult<LoggedSet>> {
  const guard = await withWriter();
  if (!guard.ok) return guard;
  if (!uuidSchema.safeParse(sessionId).success) return notFound;
  const set = parseSet(input);
  if (!set.ok) return set;

  const { data, error } = await guard.ctx.supabase
    .from("workout_sets")
    .insert({
      session_id: sessionId,
      exercise_name: set.data.exerciseName,
      weight_kg: set.data.weightKg,
      reps: set.data.reps,
    })
    .select("*")
    .single();
  if (error || !data) return error ? dbFailure(error, "add-set") : notFound;

  revalidateWorkout(sessionId);
  return { ok: true, data: toLoggedSet(data) };
}

/** FR24/FR27: edits a set the user owns. RLS hides other users' sets (→ 404). */
export async function updateSet(setId: string, input: SetInput): Promise<ActionResult> {
  const guard = await withWriter();
  if (!guard.ok) return guard;
  if (!uuidSchema.safeParse(setId).success) return notFound;
  const set = parseSet(input);
  if (!set.ok) return set;

  const { data, error } = await guard.ctx.supabase
    .from("workout_sets")
    .update({
      exercise_name: set.data.exerciseName,
      weight_kg: set.data.weightKg,
      reps: set.data.reps,
    })
    .eq("id", setId)
    .select("session_id")
    .maybeSingle();
  if (error) return dbFailure(error, "update-set");
  if (!data) return notFound;

  revalidateWorkout(data.session_id);
  return { ok: true, data: undefined };
}

export async function deleteSet(setId: string): Promise<ActionResult> {
  const guard = await withWriter();
  if (!guard.ok) return guard;
  if (!uuidSchema.safeParse(setId).success) return notFound;

  const { data, error } = await guard.ctx.supabase
    .from("workout_sets")
    .delete()
    .eq("id", setId)
    .select("session_id")
    .maybeSingle();
  if (error) return dbFailure(error, "delete-set");
  if (!data) return notFound;

  revalidateWorkout(data.session_id);
  return { ok: true, data: undefined };
}

/**
 * FR24: finishes the active workout and opens its summary. A workout without sets
 * is not kept: it is deleted and the user goes back to the dashboard.
 */
export async function finishWorkout(sessionId: string): Promise<ActionResult> {
  const guard = await withWriter();
  if (!guard.ok) return guard;
  if (!uuidSchema.safeParse(sessionId).success) return notFound;
  const { supabase } = guard.ctx;

  const session = await supabase
    .from("workout_sessions")
    .select("id, ended_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (session.error) return dbFailure(session.error, "finish-workout");
  if (!session.data) return notFound;
  if (session.data.ended_at) redirect(`/app/history/${sessionId}`);

  const { count } = await supabase
    .from("workout_sets")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (!count) {
    const { error } = await supabase
      .from("workout_sessions")
      .delete()
      .eq("id", sessionId);
    if (error) return dbFailure(error, "discard-workout");
    revalidatePath("/app", "layout");
    redirect("/app");
  }

  const { error } = await supabase
    .from("workout_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) return dbFailure(error, "finish-workout");

  revalidateWorkout(sessionId);
  redirect(`/app/history/${sessionId}?finished=1`);
}
