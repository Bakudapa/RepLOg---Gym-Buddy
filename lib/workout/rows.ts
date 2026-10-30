import type { Database } from "@/lib/supabase/types";
import type { LoggedSet } from "./sets";

type SetRow = Database["public"]["Tables"]["workout_sets"]["Row"];
type RecordRow = Database["public"]["Views"]["workout_set_records"]["Row"];

/** Maps a database row (table or records view) to the shape the UI uses. */
export function toLoggedSet(row: SetRow | RecordRow): LoggedSet {
  return {
    id: row.id,
    exerciseName: row.exercise_name,
    exerciseKey: row.exercise_key,
    weightKg: Number(row.weight_kg),
    reps: row.reps,
    performedAt: row.performed_at,
    ...("is_e1rm_pr" in row
      ? { isE1rmPr: row.is_e1rm_pr, isWeightPr: row.is_weight_pr }
      : {}),
  };
}
