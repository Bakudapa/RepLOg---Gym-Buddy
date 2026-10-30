import { describe, expect, it } from "vitest";
import { hasExactMatch, searchExercises } from "@/lib/exercise-search";
import { EXERCISES, type Exercise } from "@/lib/exercises";

const names = (query: string, list?: Exercise[]) =>
  searchExercises(query, list).map((item) => item.name);

describe("exercise data", () => {
  it("has at least 40 exercises covering every muscle group", () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(40);
    const groups = new Set(EXERCISES.map((exercise) => exercise.group));
    expect([...groups].sort()).toEqual([
      "arms",
      "back",
      "chest",
      "core",
      "legs",
      "shoulders",
    ]);
  });

  it("has unique names", () => {
    const lower = EXERCISES.map((exercise) => exercise.name.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });
});

describe("searchExercises", () => {
  it("shows popular exercises for an empty query", () => {
    expect(names("")).toEqual(["Bench Press", "Squat", "Deadlift", "Overhead Press"]);
    expect(names("   ")).toEqual(["Bench Press", "Squat", "Deadlift", "Overhead Press"]);
  });

  it("is case-insensitive", () => {
    expect(names("BENCH")).toEqual(names("bench"));
    expect(names("bEnCh")[0]).toBe("Bench Press");
  });

  it("matches aliases", () => {
    expect(names("ohp")).toEqual(["Overhead Press"]);
    expect(names("rdl")).toEqual(["Romanian Deadlift"]);
    expect(names("BP")[0]).toBe("Bench Press");
    const [first] = searchExercises("ohp");
    expect(first.alias).toEqual({ text: "ohp", start: 0, end: 3 });
    expect(first.match).toBeUndefined();
  });

  it("puts names starting with the query before names containing it", () => {
    const list: Exercise[] = [
      { name: "Leg Press", group: "legs" },
      { name: "Press Around", group: "chest" },
      { name: "Bench Press", group: "chest" },
      { name: "Pressdown", group: "arms" },
    ];
    expect(names("press", list)).toEqual([
      "Press Around",
      "Pressdown",
      "Leg Press",
      "Bench Press",
    ]);
  });

  it("ranks exact aliases above name matches, and partial aliases last", () => {
    const list: Exercise[] = [
      { name: "Push-Up", group: "chest", aliases: ["press up"] },
      { name: "Bench Press", group: "chest" },
      { name: "Overhead Thing", group: "shoulders", aliases: ["press"] },
    ];
    expect(names("press", list)).toEqual(["Overhead Thing", "Bench Press", "Push-Up"]);
    expect(names("press")[0]).not.toBe("Push-Up");
  });

  it("matches any part of the name and reports the match range", () => {
    const [result] = searchExercises("lift", [{ name: "Deadlift", group: "back" }]);
    expect(result.match).toEqual({ start: 4, end: 8 });
  });

  it("returns at most 8 suggestions", () => {
    expect(searchExercises("e").length).toBe(8);
    expect(searchExercises("press").length).toBeLessThanOrEqual(8);
  });

  it("returns nothing when nothing matches", () => {
    expect(searchExercises("zzzz")).toEqual([]);
  });
});

describe("hasExactMatch", () => {
  it("ignores case and surrounding spaces", () => {
    expect(hasExactMatch("  bench press ")).toBe(true);
    expect(hasExactMatch("bench")).toBe(false);
    expect(hasExactMatch("")).toBe(false);
  });
});
