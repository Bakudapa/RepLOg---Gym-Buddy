"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  getBrowserStorage,
  HISTORY_KEY,
  parseHistory,
  readHistory,
  removeHistoryEntry,
  upsertHistory,
  writeHistory,
  type HistoryEntry,
} from "@/lib/history";

const EMPTY: HistoryEntry[] = [];
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedEntries: HistoryEntry[] = EMPTY;

function getSnapshot(): HistoryEntry[] {
  const storage = getBrowserStorage();
  let raw: string | null = null;
  try {
    raw = storage?.getItem(HISTORY_KEY) ?? null;
  } catch {
    raw = null;
  }
  // Re-parse only when the stored string changes, so the snapshot stays referentially stable.
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedEntries = raw ? parseHistory(raw) : EMPTY;
  }
  return cachedEntries;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === HISTORY_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function update(change: (entries: HistoryEntry[]) => HistoryEntry[]) {
  const storage = getBrowserStorage();
  if (!storage) return;
  writeHistory(storage, change(readHistory(storage)));
  listeners.forEach((listener) => listener());
}

/** 1RM history backed by localStorage (FR7). Empty and inert when storage is unavailable. */
export function useHistory() {
  const entries = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const add = useCallback(
    (entry: Omit<HistoryEntry, "createdAt">) =>
      update((list) => upsertHistory(list, { ...entry, createdAt: Date.now() })),
    [],
  );
  const remove = useCallback(
    (exercise: string) => update((list) => removeHistoryEntry(list, exercise)),
    [],
  );
  const clear = useCallback(() => update(() => []), []);
  return { entries, add, remove, clear };
}
