/** Pure helpers for workout sets. No I/O; shared by server pages and client components. */

export type LoggedSet = {
  id: string;
  exerciseName: string;
  exerciseKey: string;
  weightKg: number;
  reps: number;
  performedAt: string;
  /** Epley estimate from the database (records view only). */
  e1rm?: number;
  isE1rmPr?: boolean;
  isWeightPr?: boolean;
};

export type NumberedSet<T extends LoggedSet = LoggedSet> = T & { number: number };

export type ExerciseGroup<T extends LoggedSet = LoggedSet> = {
  exerciseKey: string;
  exerciseName: string;
  sets: NumberedSet<T>[];
};

/** Same key the database generates: lower(btrim(name)). */
export function exerciseKey(name: string): string {
  return name.trim().toLowerCase();
}

const byTime = (a: LoggedSet, b: LoggedSet) =>
  a.performedAt < b.performedAt ? -1 : a.performedAt > b.performedAt ? 1 : 0;

/**
 * Groups sets per exercise in the order each exercise was first done. Set numbers
 * (1, 2, 3, …) come from the order within the exercise, so deleting a set renumbers
 * the rest (FR24).
 */
export function groupSetsByExercise<T extends LoggedSet>(sets: T[]): ExerciseGroup<T>[] {
  const groups = new Map<string, ExerciseGroup<T>>();
  for (const set of [...sets].sort(byTime)) {
    let group = groups.get(set.exerciseKey);
    if (!group) {
      group = { exerciseKey: set.exerciseKey, exerciseName: set.exerciseName, sets: [] };
      groups.set(set.exerciseKey, group);
    }
    group.sets.push({ ...set, number: group.sets.length + 1 });
  }
  return [...groups.values()];
}

/** Σ weight × reps, rounded to one decimal to avoid float noise. */
export function totalVolume(sets: Pick<LoggedSet, "weightKg" | "reps">[]): number {
  const sum = sets.reduce((total, set) => total + set.weightKg * set.reps, 0);
  return Math.round(sum * 10) / 10;
}

export type LastSet = { weightKg: number; reps: number };

/**
 * Latest weight and reps per exercise key. `sets` can be in any order; the newest
 * set wins. Used to pre-fill the form after picking an exercise (FR24).
 */
export function lastSetByExercise(sets: LoggedSet[]): Record<string, LastSet> {
  const result: Record<string, LastSet> = {};
  for (const set of [...sets].sort(byTime)) {
    result[set.exerciseKey] = { weightKg: set.weightKg, reps: set.reps };
  }
  return result;
}

/** Distinct exercise names, most recently used first (combobox suggestions). */
export function recentExerciseNames(sets: LoggedSet[], limit = 30): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const set of [...sets].sort(byTime).reverse()) {
    if (seen.has(set.exerciseKey)) continue;
    seen.add(set.exerciseKey);
    names.push(set.exerciseName.trim());
    if (names.length === limit) break;
  }
  return names;
}

/** "Workout — 30 Oct" in the device's locale and time zone (FR23). */
export function defaultSessionName(
  date: Date,
  locale?: string,
  timeZone?: string,
): string {
  const day = new Intl.DateTimeFormat(locale ?? "en-GB", {
    day: "numeric",
    month: "short",
    timeZone,
  }).format(date);
  return `Workout — ${day}`;
}

/** Whole minutes between two ISO timestamps (never negative). */
export function durationMinutes(startedAt: string, endedAt: string): number {
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  return Number.isFinite(ms) && ms > 0 ? Math.round(ms / 60000) : 0;
}

/** "1 h 05 min" / "45 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, "0")} min`;
}
