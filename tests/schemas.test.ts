import { describe, expect, it } from "vitest";
import {
  adminListQuerySchema,
  feedbackSchema,
  fieldErrors,
  loginSchema,
  oneRepMaxSchema,
  waitlistSchema,
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

describe("waitlistSchema", () => {
  it("trims and lowercases the email", () => {
    const result = waitlistSchema.parse({ email: "  Lifter@Example.COM  ", website: "" });
    expect(result.email).toBe("lifter@example.com");
  });

  it("allows the honeypot to be absent", () => {
    expect(waitlistSchema.safeParse({ email: "a@example.com" }).success).toBe(true);
  });

  it.each([
    "",
    "plain",
    "a@",
    "@example.com",
    "a b@example.com",
    `${"a".repeat(250)}@x.co`,
  ])("rejects %j", (email) => {
    const result = waitlistSchema.safeParse({ email });
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).email).toBeDefined();
  });

  it("rejects a missing email and non-string honeypot", () => {
    expect(waitlistSchema.safeParse({}).success).toBe(false);
    expect(waitlistSchema.safeParse({ email: "a@example.com", website: 1 }).success).toBe(
      false,
    );
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
