import { describe, expect, it } from "vitest";
import { isLessReliable, recordsFromSets, summarizeSession } from "@/lib/workout/summary";
import type { LoggedSet } from "@/lib/workout/sets";

let n = 0;
const set = (
  name: string,
  weightKg: number,
  reps: number,
  minute: number,
  flags: Partial<LoggedSet> = {},
): LoggedSet => ({
  id: `s${++n}`,
  exerciseName: name,
  exerciseKey: name.toLowerCase(),
  weightKg,
  reps,
  performedAt: new Date(Date.UTC(2026, 9, 30, 10, minute)).toISOString(),
  ...flags,
});

describe("recordsFromSets", () => {
  it("lists nothing when no set is flagged (first set, equal values)", () => {
    expect(recordsFromSets([set("Squat", 100, 5, 0), set("Squat", 100, 5, 5)])).toEqual(
      [],
    );
  });

  it("keeps the best set per exercise and kind", () => {
    const records = recordsFromSets([
      set("Bench", 100, 5, 0, { isE1rmPr: true, isWeightPr: true }),
      set("Bench", 102.5, 5, 5, { isE1rmPr: true, isWeightPr: true }),
      set("Bench", 90, 10, 10, { isE1rmPr: true }),
    ]);
    expect(records.map((r) => [r.kind, r.value, r.weightKg, r.reps])).toEqual([
      // Ordered by when the record set was done.
      ["weight", 102.5, 102.5, 5],
      ["e1rm", 120, 90, 10],
    ]);
  });

  it("uses the Epley estimate, with a single rep counting as its own max", () => {
    const [record] = recordsFromSets([set("Deadlift", 140, 1, 0, { isE1rmPr: true })]);
    expect(record.value).toBe(140);
  });

  it("marks estimates from more than 12 reps as less reliable", () => {
    const [record] = recordsFromSets([set("Curl", 20, 15, 0, { isE1rmPr: true })]);
    expect(record.lessReliable).toBe(true);
    expect(isLessReliable(12)).toBe(false);
    expect(isLessReliable(13)).toBe(true);
  });
});

describe("summarizeSession", () => {
  it("adds up duration, exercises, sets, volume and records", () => {
    const summary = summarizeSession(
      { startedAt: "2026-10-30T10:00:00Z", endedAt: "2026-10-30T11:12:00Z" },
      [
        set("Bench", 80, 8, 0),
        set("Bench", 85, 5, 5, { isWeightPr: true }),
        set("Row", 60, 10, 20),
      ],
    );
    expect(summary).toMatchObject({
      durationMinutes: 72,
      exerciseCount: 2,
      setCount: 3,
      volumeKg: 640 + 425 + 600,
    });
    expect(summary.records).toHaveLength(1);
  });

  it("handles an unfinished session", () => {
    expect(
      summarizeSession({ startedAt: "2026-10-30T10:00:00Z", endedAt: null }, [])
        .durationMinutes,
    ).toBe(0);
  });
});
