import { describe, expect, it } from "vitest";
import {
  deleteAccountSchema,
  displayNameSchema,
  progressRangeSchema,
  resetPasswordSchema,
  setSchema,
  signUpSchema,
  startSessionSchema,
  updateSessionSchema,
  uuidSchema,
  adminListQuerySchema,
  pageQuerySchema,
  feedbackSchema,
  forgotPasswordSchema,
  fieldErrors,
  loginSchema,
  oneRepMaxSchema,
} from "@/lib/validation/schemas";

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

describe("email field (shared by sign up, forgot password, feedback)", () => {
  it("trims and lowercases the email", () => {
    const result = forgotPasswordSchema.parse({ email: "  Lifter@Example.COM  " });
    expect(result.email).toBe("lifter@example.com");
  });

  it.each([
    "",
    "plain",
    "a@",
    "@example.com",
    "a b@example.com",
    `${"a".repeat(250)}@x.co`,
  ])("rejects %j", (email) => {
    const result = forgotPasswordSchema.safeParse({ email });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).email).toBeDefined();
  });

  it("rejects a missing email", () => {
    expect(forgotPasswordSchema.safeParse({}).success).toBe(false);
  });
});

describe("feedbackSchema", () => {
  const valid = { category: "feature", message: "Please add a plate calculator." };

  it("accepts each category", () => {
    for (const category of ["feature", "critique", "bug"]) {
      expect(feedbackSchema.safeParse({ ...valid, category }).success).toBe(true);
    }
  });

  it("treats an empty email as not provided", () => {
    expect(feedbackSchema.parse({ ...valid, email: "   " }).email).toBeUndefined();
    expect(feedbackSchema.parse({ ...valid, email: "" }).email).toBeUndefined();
    expect(feedbackSchema.parse(valid).email).toBeUndefined();
  });

  it("normalizes a provided email", () => {
    expect(feedbackSchema.parse({ ...valid, email: " Me@Example.com " }).email).toBe(
      "me@example.com",
    );
  });

  it("trims the message and enforces 10–1000 characters", () => {
    expect(feedbackSchema.parse({ ...valid, message: "  ten chars!  " }).message).toBe(
      "ten chars!",
    );
    expect(feedbackSchema.safeParse({ ...valid, message: "   short   " }).success).toBe(
      false,
    );
    expect(
      feedbackSchema.safeParse({ ...valid, message: "x".repeat(1000) }).success,
    ).toBe(true);
    expect(
      feedbackSchema.safeParse({ ...valid, message: "x".repeat(1001) }).success,
    ).toBe(false);
  });

  it("rejects unknown categories and invalid emails", () => {
    const badCategory = feedbackSchema.safeParse({ ...valid, category: "praise" });
    expect(badCategory.success).toBe(false);
    if (!badCategory.success)
      expect(fieldErrors(badCategory.error).category).toBeDefined();
    expect(feedbackSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });
});

describe("adminListQuerySchema", () => {
  it("defaults page to 1 and coerces strings", () => {
    expect(adminListQuerySchema.parse({})).toEqual({ page: 1 });
    expect(adminListQuerySchema.parse({ page: "3", category: "bug" })).toEqual({
      page: 3,
      category: "bug",
    });
  });

  it.each([
    { page: "0" },
    { page: "-1" },
    { page: "1.5" },
    { page: "abc" },
    { category: "x" },
  ])("rejects %j", (query) => {
    expect(adminListQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    expect(
      loginSchema.safeParse({ email: "admin@example.com", password: "x" }).success,
    ).toBe(true);
  });

  it.each([
    { email: "nope", password: "secret" },
    { email: "admin@example.com", password: "" },
    { email: "admin@example.com", password: "x".repeat(129) },
  ])("rejects %j", (input) => {
    expect(loginSchema.safeParse(input).success).toBe(false);
  });
});

describe("pageQuerySchema", () => {
  it("falls back to page 1 for anything invalid", () => {
    expect(pageQuerySchema.parse({})).toEqual({ page: 1 });
    expect(pageQuerySchema.parse({ page: "4" })).toEqual({ page: 4 });
    expect(pageQuerySchema.parse({ page: "-2" })).toEqual({ page: 1 });
    expect(pageQuerySchema.parse({ page: ["2", "3"] })).toEqual({ page: 1 });
  });
});

describe("signUpSchema / resetPasswordSchema", () => {
  const valid = {
    displayName: " Dafa ",
    email: "D@Example.com",
    password: "12345678",
    confirmPassword: "12345678",
  };

  it("accepts and normalizes valid input", () => {
    expect(signUpSchema.parse(valid)).toMatchObject({
      displayName: "Dafa",
      email: "d@example.com",
    });
  });

  it.each([
    [{ password: "1234567", confirmPassword: "1234567" }, "password"],
    [{ password: "x".repeat(73), confirmPassword: "x".repeat(73) }, "password"],
    [{ confirmPassword: "different" }, "confirmPassword"],
    [{ displayName: "   " }, "displayName"],
    [{ displayName: "x".repeat(41) }, "displayName"],
  ])("rejects %j", (patch, field) => {
    const result = signUpSchema.safeParse({ ...valid, ...patch });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error)).toHaveProperty(field);
  });

  it("checks the confirmation when resetting", () => {
    expect(
      resetPasswordSchema.safeParse({ password: "abcdefgh", confirmPassword: "abcdefgh" })
        .success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ password: "abcdefgh", confirmPassword: "abcdefgX" })
        .success,
    ).toBe(false);
  });
});

describe("setSchema", () => {
  it("accepts bodyweight (0 kg) and the limits", () => {
    expect(
      setSchema.safeParse({ exerciseName: "Pull-Up", weightKg: 0, reps: 12 }).success,
    ).toBe(true);
    expect(
      setSchema.safeParse({ exerciseName: "Leg Press", weightKg: 1000, reps: 100 })
        .success,
    ).toBe(true);
  });

  it.each([
    [{ exerciseName: "" }, "exerciseName"],
    [{ exerciseName: "x".repeat(41) }, "exerciseName"],
    [{ weightKg: -0.5 }, "weightKg"],
    [{ weightKg: 1000.5 }, "weightKg"],
    [{ weightKg: 62.25 }, "weightKg"],
    [{ reps: 0 }, "reps"],
    [{ reps: 101 }, "reps"],
    [{ reps: 8.5 }, "reps"],
  ])("rejects %j", (patch, field) => {
    const result = setSchema.safeParse({
      exerciseName: "Squat",
      weightKg: 100,
      reps: 5,
      ...patch,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(fieldErrors(result.error))).toEqual([field]);
  });
});

describe("session schemas", () => {
  it("treats a blank start name as no name", () => {
    expect(startSessionSchema.parse({ name: "  " })).toEqual({ name: undefined });
    expect(startSessionSchema.parse({ name: " Push " })).toEqual({ name: "Push" });
    expect(startSessionSchema.safeParse({ name: "x".repeat(61) }).success).toBe(false);
  });

  it("requires a name and limits notes to 500 characters", () => {
    expect(updateSessionSchema.safeParse({ name: "", notes: "" }).success).toBe(false);
    expect(updateSessionSchema.parse({ name: "Legs", notes: "  " })).toEqual({
      name: "Legs",
      notes: undefined,
    });
    expect(
      updateSessionSchema.safeParse({ name: "Legs", notes: "x".repeat(501) }).success,
    ).toBe(false);
  });
});

describe("account schemas", () => {
  it("validates the display name and the delete password", () => {
    expect(displayNameSchema.safeParse({ displayName: "A" }).success).toBe(true);
    expect(displayNameSchema.safeParse({ displayName: "" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ password: "" }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ password: "x".repeat(73) }).success).toBe(
      false,
    );
  });
});

describe("progressRangeSchema / uuidSchema", () => {
  it("defaults the range to 12 weeks", () => {
    expect(progressRangeSchema.parse({})).toEqual({ range: "12w" });
    expect(progressRangeSchema.parse({ range: "4w" })).toEqual({ range: "4w" });
    expect(progressRangeSchema.parse({ range: "1y" })).toEqual({ range: "12w" });
  });

  it("accepts only UUIDs as ids", () => {
    expect(uuidSchema.safeParse("22222222-2222-4222-8222-222222222222").success).toBe(
      true,
    );
    expect(uuidSchema.safeParse("123").success).toBe(false);
    expect(uuidSchema.safeParse("22222222-2222-4222-8222-22222222222'").success).toBe(
      false,
    );
  });
});
