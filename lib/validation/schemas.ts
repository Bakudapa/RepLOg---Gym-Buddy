import { z } from "zod";

/** Shared between client forms and Route Handlers. The server is the source of truth. */

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
