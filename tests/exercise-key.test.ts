import { describe, expect, it } from "vitest";
import { exerciseHref, parseExerciseKey } from "@/lib/workout/exercise-key";

describe("parseExerciseKey", () => {
  it("accepts encoded database keys", () => {
    expect(parseExerciseKey("bench%20press")).toBe("bench press");
    expect(parseExerciseKey(encodeURIComponent("close-grip bench press"))).toBe(
      "close-grip bench press",
    );
    expect(parseExerciseKey(exerciseHref("t-bar row").split("/").pop()!)).toBe(
      "t-bar row",
    );
  });

  it("rejects malformed, non-normalized, or overlong keys", () => {
    expect(parseExerciseKey("%E0%A4%A")).toBeNull();
    expect(parseExerciseKey("Bench%20Press")).toBeNull();
    expect(parseExerciseKey("%20bench")).toBeNull();
    expect(parseExerciseKey("")).toBeNull();
    expect(parseExerciseKey("x".repeat(41))).toBeNull();
  });
});
