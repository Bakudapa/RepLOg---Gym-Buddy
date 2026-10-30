import { describe, expect, it } from "vitest";
import { fieldErrors, oneRepMaxSchema } from "@/lib/validation/schemas";

describe("oneRepMaxSchema", () => {
  const valid = { exercise: "Bench Press", weight: 82.5, reps: 5 };

  it("accepts valid input and trims the exercise", () => {
    const result = oneRepMaxSchema.safeParse({ ...valid, exercise: "  Bench Press  " });
    expect(result.success && result.data.exercise).toBe("Bench Press");
  });

  it.each([
    [{ exercise: "" }, "exercise"],
    [{ exercise: "   " }, "exercise"],
    [{ exercise: "x".repeat(41) }, "exercise"],
    [{ weight: 0.5 }, "weight"],
    [{ weight: 500.5 }, "weight"],
    [{ weight: 80.3 }, "weight"],
    [{ weight: Number.NaN }, "weight"],
    [{ reps: 0 }, "reps"],
    [{ reps: 13 }, "reps"],
    [{ reps: 2.5 }, "reps"],
  ])("rejects %j", (patch, field) => {
    const result = oneRepMaxSchema.safeParse({ ...valid, ...patch });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrors(result.error))).toEqual([field]);
  });

  it("accepts the boundaries", () => {
    expect(
      oneRepMaxSchema.safeParse({ exercise: "x".repeat(40), weight: 1, reps: 1 }).success,
    ).toBe(true);
    expect(oneRepMaxSchema.safeParse({ ...valid, weight: 500, reps: 12 }).success).toBe(
      true,
    );
  });
});
