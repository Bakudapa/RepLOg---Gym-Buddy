import { EXERCISES, POPULAR_EXERCISES, type Exercise } from "./exercises";

export const MAX_SUGGESTIONS = 8;

export type Suggestion = {
  name: string;
  /** Range of `name` that matched the query, for highlighting. */
  match?: { start: number; end: number };
  /** Set when the query matched an alias instead of the name. */
  alias?: { text: string; start: number; end: number };
};

type Ranked = { suggestion: Suggestion; rank: number; order: number };

/**
 * Filters exercises for the combobox (FR6).
 * Case-insensitive, matches anywhere in the name or an alias. Ranking:
 * 0. name starts with the query
 * 1. an alias equals the query ("ohp" → Overhead Press)
 * 2. name contains the query
 * 3. an alias contains the query
 */
export function searchExercises(
  query: string,
  exercises: Exercise[] = EXERCISES,
  limit: number = MAX_SUGGESTIONS,
): Suggestion[] {
  const q = query.trim().toLowerCase();

  if (q === "") {
    return POPULAR_EXERCISES.map((name) => ({ name })).slice(0, limit);
  }

  const ranked: Ranked[] = [];
  exercises.forEach((exercise, order) => {
    const name = exercise.name.toLowerCase();
    const nameIndex = name.indexOf(q);
    if (nameIndex !== -1) {
      ranked.push({
        suggestion: {
          name: exercise.name,
          match: { start: nameIndex, end: nameIndex + q.length },
        },
        rank: nameIndex === 0 ? 0 : 2,
        order,
      });
      return;
    }

    let best: Ranked | undefined;
    for (const alias of exercise.aliases ?? []) {
      const aliasIndex = alias.toLowerCase().indexOf(q);
      if (aliasIndex === -1) continue;
      const rank = alias.toLowerCase() === q ? 1 : 3;
      if (!best || rank < best.rank) {
        best = {
          suggestion: {
            name: exercise.name,
            alias: { text: alias, start: aliasIndex, end: aliasIndex + q.length },
          },
          rank,
          order,
        };
      }
    }
    if (best) ranked.push(best);
  });

  return ranked
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, limit)
    .map((item) => item.suggestion);
}

/** True when the query equals an exercise name exactly (ignoring case and outer spaces). */
export function hasExactMatch(query: string, exercises: Exercise[] = EXERCISES): boolean {
  const q = query.trim().toLowerCase();
  return q !== "" && exercises.some((exercise) => exercise.name.toLowerCase() === q);
}
