import { EXERCISES, POPULAR_EXERCISES, type Exercise } from "./exercises";

export const MAX_SUGGESTIONS = 8;

export type Suggestion = {
  name: string;
  /** Range of `name` that matched the query, for highlighting. */
  match?: { start: number; end: number };
  /** Set when the query matched an alias instead of the name. */
  alias?: { text: string; start: number; end: number };
  /** The user has logged this exercise before. */
  recent?: boolean;
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
export function hasExactMatch(
  query: string,
  exercises: Exercise[] = EXERCISES,
  recent: string[] = [],
): boolean {
  const q = query.trim().toLowerCase();
  return (
    q !== "" &&
    (exercises.some((exercise) => exercise.name.toLowerCase() === q) ||
      recent.some((name) => name.trim().toLowerCase() === q))
  );
}

/**
 * Combobox search that also offers exercises the user has logged before (FR24).
 * Matching recent names come first (prefix matches before others), then the
 * built-in list without duplicates. An empty query lists recent exercises, then
 * the popular ones.
 */
export function searchWithRecent(
  query: string,
  recent: string[],
  limit: number = MAX_SUGGESTIONS,
): Suggestion[] {
  const q = query.trim().toLowerCase();
  const seen = new Set<string>();
  const unique = recent.filter((name) => {
    const key = name.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const recentMatches: Suggestion[] = unique
    .map((name, order) => ({ name, order, index: q ? name.toLowerCase().indexOf(q) : 0 }))
    .filter((item) => item.index !== -1)
    .sort((a, b) => Number(a.index !== 0) - Number(b.index !== 0) || a.order - b.order)
    .map((item) => ({
      name: item.name,
      recent: true,
      ...(q ? { match: { start: item.index, end: item.index + q.length } } : {}),
    }));

  const builtIn = searchExercises(query, EXERCISES, limit).filter(
    (suggestion) => !seen.has(suggestion.name.toLowerCase()),
  );

  return [...recentMatches, ...builtIn].slice(0, limit);
}
