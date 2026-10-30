import { describe, expect, it } from "vitest";
import {
  defaultSessionName,
  durationMinutes,
  exerciseKey,
  formatDuration,
  groupSetsByExercise,
  lastSetByExercise,
  recentExerciseNames,
  totalVolume,
  type LoggedSet,
} from "@/lib/workout/sets";

let n = 0;
const set = (
  name: string,
  weightKg: number,
  reps: number,
  minute: number,
): LoggedSet => ({
  id: `s${++n}`,
  exerciseName: name,
  exerciseKey: exerciseKey(name),
  weightKg,
  reps,
  performedAt: new Date(Date.UTC(2026, 9, 30, 10, minute)).toISOString(),
});

describe("groupSetsByExercise", () => {
  it("groups by exercise in first-performed order and numbers sets by time", () => {
    const groups = groupSetsByExercise([
      set("Squat", 100, 5, 20),
      set("Bench Press", 80, 8, 0),
      set("bench press ", 82.5, 6, 10),
      set("Squat", 105, 5, 25),
      set("Bench Press", 80, 8, 5),
    ]);
    expect(groups.map((group) => group.exerciseName)).toEqual(["Bench Press", "Squat"]);
    expect(groups[0].sets.map((s) => [s.number, s.weightKg])).toEqual([
      [1, 80],
      [2, 80],
      [3, 82.5],
    ]);
    expect(groups[1].sets.map((s) => s.number)).toEqual([1, 2]);
  });

  it("returns nothing for no sets", () => {
    expect(groupSetsByExercise([])).toEqual([]);
  });
});

describe("totalVolume", () => {
  it("sums weight × reps without float noise", () => {
    expect(
      totalVolume([set("A", 82.5, 6, 0), set("A", 0.5, 3, 1), set("B", 0, 12, 2)]),
    ).toBe(496.5);
    expect(totalVolume([])).toBe(0);
  });
});

describe("lastSetByExercise / recentExerciseNames", () => {
  const sets = [set("Squat", 100, 5, 0), set("Row", 60, 10, 5), set("squat", 110, 3, 10)];

  it("keeps the newest weight and reps per exercise", () => {
    expect(lastSetByExercise(sets)).toEqual({
      squat: { weightKg: 110, reps: 3 },
      row: { weightKg: 60, reps: 10 },
    });
  });

  it("lists distinct names, most recent first", () => {
    expect(recentExerciseNames(sets)).toEqual(["squat", "Row"]);
    expect(recentExerciseNames(sets, 1)).toEqual(["squat"]);
  });
});

describe("durations and names", () => {
  it("computes and formats durations", () => {
    expect(durationMinutes("2026-10-30T10:00:00Z", "2026-10-30T11:05:20Z")).toBe(65);
    expect(durationMinutes("2026-10-30T10:00:00Z", "2026-10-30T09:00:00Z")).toBe(0);
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(65)).toBe("1 h 05 min");
  });

  it("builds the default workout name in the given time zone", () => {
    const date = new Date("2026-10-30T23:30:00Z");
    expect(defaultSessionName(date, "en-GB", "UTC")).toBe("Workout — 30 Oct");
    expect(defaultSessionName(date, "en-GB", "Asia/Jakarta")).toBe("Workout — 31 Oct");
  });
});
