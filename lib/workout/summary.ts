import { estimateOneRepMax } from "@/lib/one-rep-max";
import { durationMinutes, totalVolume, type LoggedSet } from "./sets";

/** Epley is fitted to low rep ranges; above this the estimate is shown with a caveat (FR26). */
export const RELIABLE_MAX_REPS = 12;

export function isLessReliable(reps: number): boolean {
  return reps > RELIABLE_MAX_REPS;
}

export type PersonalRecord = {
  kind: "e1rm" | "weight";
  exerciseKey: string;
  exerciseName: string;
  /** Estimated 1RM or the weight itself, in kg. */
  value: number;
  weightKg: number;
  reps: number;
  performedAt: string;
  lessReliable: boolean;
};

/**
 * New records in a list of sets whose PR flags came from the database
 * (workout_set_records). When an exercise beat its record several times in one
 * session, only the best set per kind is listed.
 */
export function recordsFromSets(sets: LoggedSet[]): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const set of sets) {
    const candidates: PersonalRecord[] = [];
    if (set.isE1rmPr) {
      candidates.push({
        kind: "e1rm",
        exerciseKey: set.exerciseKey,
        exerciseName: set.exerciseName,
        value: estimateOneRepMax(set.weightKg, set.reps),
        weightKg: set.weightKg,
        reps: set.reps,
        performedAt: set.performedAt,
        lessReliable: isLessReliable(set.reps),
      });
    }
    if (set.isWeightPr) {
      candidates.push({
        kind: "weight",
        exerciseKey: set.exerciseKey,
        exerciseName: set.exerciseName,
        value: set.weightKg,
        weightKg: set.weightKg,
        reps: set.reps,
        performedAt: set.performedAt,
        lessReliable: false,
      });
    }
    for (const record of candidates) {
      const key = `${record.exerciseKey}:${record.kind}`;
      const current = best.get(key);
      if (!current || record.value > current.value) best.set(key, record);
    }
  }
  return [...best.values()].sort(
    (a, b) => a.performedAt.localeCompare(b.performedAt) || (a.kind === "e1rm" ? -1 : 1),
  );
}

export type SessionSummary = {
  durationMinutes: number;
  exerciseCount: number;
  setCount: number;
  volumeKg: number;
  records: PersonalRecord[];
};

/** FR25: what the summary screen shows for a finished workout. */
export function summarizeSession(
  session: { startedAt: string; endedAt: string | null },
  sets: LoggedSet[],
): SessionSummary {
  return {
    durationMinutes: session.endedAt
      ? durationMinutes(session.startedAt, session.endedAt)
      : 0,
    exerciseCount: new Set(sets.map((set) => set.exerciseKey)).size,
    setCount: sets.length,
    volumeKg: totalVolume(sets),
    records: recordsFromSets(sets),
  };
}
