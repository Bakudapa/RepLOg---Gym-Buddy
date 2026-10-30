import { z } from "zod";

export const HISTORY_KEY = "replog:1rm-history";
export const MAX_HISTORY = 20;

const historyEntrySchema = z.object({
  exercise: z.string().trim().min(1).max(40),
  weight: z.number().min(1).max(500),
  reps: z.number().int().min(1).max(12),
  oneRepMax: z.number().positive(),
  createdAt: z.number().int().nonnegative(),
});

export type HistoryEntry = z.infer<typeof historyEntrySchema>;

/** The subset of the Storage API we use, so tests can pass a fake. */
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Returns localStorage, or null when it is missing or blocked (private mode, disabled cookies). */
export function getBrowserStorage(): StorageLike | null {
  try {
    if (typeof window === "undefined") return null;
    const storage = window.localStorage;
    const probe = "replog:probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** Parses stored JSON. Invalid JSON gives an empty list; invalid entries are dropped. */
export function parseHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const entries: HistoryEntry[] = [];
  for (const item of data) {
    const parsed = historyEntrySchema.safeParse(item);
    if (parsed.success) entries.push(parsed.data);
  }
  return entries.slice(0, MAX_HISTORY);
}

/**
 * Adds an entry at the top. An existing entry for the same exercise (case-insensitive)
 * is replaced rather than duplicated. Keeps at most `max` entries, dropping the oldest.
 */
export function upsertHistory(
  entries: HistoryEntry[],
  entry: HistoryEntry,
  max: number = MAX_HISTORY,
): HistoryEntry[] {
  const key = entry.exercise.trim().toLowerCase();
  const rest = entries.filter((item) => item.exercise.trim().toLowerCase() !== key);
  return [entry, ...rest].slice(0, max);
}

export function removeHistoryEntry(
  entries: HistoryEntry[],
  exercise: string,
): HistoryEntry[] {
  const key = exercise.trim().toLowerCase();
  return entries.filter((item) => item.exercise.trim().toLowerCase() !== key);
}

export function readHistory(storage: StorageLike | null): HistoryEntry[] {
  if (!storage) return [];
  try {
    return parseHistory(storage.getItem(HISTORY_KEY));
  } catch {
    return [];
  }
}

/** Returns false when the write failed (quota exceeded, storage blocked). */
export function writeHistory(
  storage: StorageLike | null,
  entries: HistoryEntry[],
): boolean {
  if (!storage) return false;
  try {
    if (entries.length === 0) storage.removeItem(HISTORY_KEY);
    else storage.setItem(HISTORY_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}
