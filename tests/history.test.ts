import { describe, expect, it } from "vitest";
import {
  HISTORY_KEY,
  MAX_HISTORY,
  parseHistory,
  readHistory,
  removeHistoryEntry,
  upsertHistory,
  writeHistory,
  type HistoryEntry,
  type StorageLike,
} from "@/lib/history";

const entry = (exercise: string, createdAt = 1, oneRepMax = 100): HistoryEntry => ({
  exercise,
  weight: 80,
  reps: 8,
  oneRepMax,
  createdAt,
});

function memoryStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
  removeItem: () => {
    throw new Error("SecurityError");
  },
};

describe("upsertHistory", () => {
  it("adds new entries to the top", () => {
    const list = upsertHistory([entry("Squat")], entry("Bench Press", 2));
    expect(list.map((item) => item.exercise)).toEqual(["Bench Press", "Squat"]);
  });

  it("updates an existing exercise (case-insensitive) and moves it to the top", () => {
    const list = [entry("Squat", 1), entry("Bench Press", 2, 100), entry("Deadlift", 3)];
    const next = upsertHistory(list, entry("bench press", 4, 110));
    expect(next).toHaveLength(3);
    expect(next[0]).toMatchObject({ exercise: "bench press", oneRepMax: 110 });
    expect(next.map((item) => item.exercise)).toEqual([
      "bench press",
      "Squat",
      "Deadlift",
    ]);
  });

  it(`keeps at most ${MAX_HISTORY} entries, dropping the oldest`, () => {
    let list: HistoryEntry[] = [];
    for (let i = 0; i < 25; i++) list = upsertHistory(list, entry(`Exercise ${i}`, i));
    expect(list).toHaveLength(MAX_HISTORY);
    expect(list[0].exercise).toBe("Exercise 24");
    expect(list.at(-1)?.exercise).toBe("Exercise 5");
  });
});

describe("removeHistoryEntry", () => {
  it("removes by name, ignoring case", () => {
    const list = removeHistoryEntry([entry("Squat"), entry("Deadlift")], "SQUAT");
    expect(list.map((item) => item.exercise)).toEqual(["Deadlift"]);
  });
});

describe("parseHistory", () => {
  it("returns an empty list for missing or broken JSON", () => {
    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory("{not json")).toEqual([]);
    expect(parseHistory('{"a":1}')).toEqual([]);
  });

  it("drops invalid entries and keeps valid ones", () => {
    const raw = JSON.stringify([
      entry("Squat"),
      { exercise: "", weight: 80, reps: 8, oneRepMax: 100, createdAt: 1 },
      { exercise: "Bench", weight: "80", reps: 8, oneRepMax: 100, createdAt: 1 },
      { exercise: "Row", weight: 80, reps: 30, oneRepMax: 100, createdAt: 1 },
      null,
      "text",
      entry("Deadlift"),
    ]);
    expect(parseHistory(raw).map((item) => item.exercise)).toEqual(["Squat", "Deadlift"]);
  });
});

describe("readHistory / writeHistory", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    expect(writeHistory(storage, [entry("Squat")])).toBe(true);
    expect(readHistory(storage)).toEqual([entry("Squat")]);
    expect(storage.data[HISTORY_KEY]).toBeDefined();
  });

  it("removes the key when the list is empty", () => {
    const storage = memoryStorage({ [HISTORY_KEY]: JSON.stringify([entry("Squat")]) });
    writeHistory(storage, []);
    expect(storage.data[HISTORY_KEY]).toBeUndefined();
  });

  it("ignores corrupted stored data", () => {
    expect(readHistory(memoryStorage({ [HISTORY_KEY]: "corrupted" }))).toEqual([]);
  });

  it("works without storage", () => {
    expect(readHistory(null)).toEqual([]);
    expect(writeHistory(null, [entry("Squat")])).toBe(false);
  });

  it("does not throw when storage throws", () => {
    expect(readHistory(throwingStorage)).toEqual([]);
    expect(writeHistory(throwingStorage, [entry("Squat")])).toBe(false);
  });
});
