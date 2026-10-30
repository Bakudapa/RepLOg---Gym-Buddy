import { z } from "zod";

/** Shared between client forms and Route Handlers. The server is the source of truth. */

export const FEEDBACK_CATEGORIES = ["feature", "critique", "bug"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

const EMAIL_MESSAGE = "Please enter a valid email address.";

const emailField = z
  .string({ error: EMAIL_MESSAGE })
  .trim()
  .toLowerCase()
  .max(254, { error: "Email must be 254 characters or fewer." })
  .pipe(z.email({ error: EMAIL_MESSAGE }));

/** Honeypot: real users never see it, so any value means a bot. */
const honeypotField = z.string().max(1000).optional();

export const waitlistSchema = z.object({
  email: emailField,
  website: honeypotField,
});

export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES, { error: "Choose a category." }),
  message: z
    .string({ error: "Write a message between 10 and 1000 characters." })
    .trim()
    .min(10, { error: "Write at least 10 characters." })
    .max(1000, { error: "Keep it under 1000 characters." }),
  // Optional: an empty string counts as "not provided".
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    emailField.optional(),
  ),
  website: honeypotField,
});

export const adminListQuerySchema = z.object({
  page: z.coerce
    .number({ error: "Page must be a whole number of 1 or more." })
    .int({ error: "Page must be a whole number of 1 or more." })
    .min(1, { error: "Page must be a whole number of 1 or more." })
    .max(100000, { error: "Page is too large." })
    .default(1),
  category: z.enum(FEEDBACK_CATEGORIES, { error: "Unknown category." }).optional(),
});

export const loginSchema = z.object({
  email: z.email({ error: "Invalid email or password." }),
  password: z
    .string({ error: "Invalid email or password." })
    .min(1, { error: "Invalid email or password." })
    .max(128, { error: "Invalid email or password." }),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;

export const oneRepMaxSchema = z.object({
  exercise: z
    .string({ error: "Choose or type an exercise." })
    .trim()
    .min(1, { error: "Choose or type an exercise." })
    .max(40, { error: "Use 40 characters or fewer." }),
  weight: z
    .number({ error: "Enter a weight between 1 and 500 kg." })
    .min(1, { error: "Enter a weight between 1 and 500 kg." })
    .max(500, { error: "Enter a weight between 1 and 500 kg." })
    .multipleOf(0.5, { error: "Use steps of 0.5 kg." }),
  reps: z
    .number({ error: "Enter whole reps from 1 to 12." })
    .int({ error: "Enter whole reps from 1 to 12." })
    .min(1, { error: "Enter whole reps from 1 to 12." })
    .max(12, { error: "Enter whole reps from 1 to 12." }),
});

export type OneRepMaxInput = z.infer<typeof oneRepMaxSchema>;

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

/** First error message per field, in the shape used by forms and the API error body. */
export function fieldErrors<K extends string>(error: z.ZodError): FieldErrors<K> {
  const result: FieldErrors<K> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in result)) {
      result[key as K] = issue.message;
    }
  }
  return result;
}
