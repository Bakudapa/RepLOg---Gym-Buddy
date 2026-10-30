import type { FieldErrors } from "@/lib/validation/schemas";

/** Result of an /app Server Action. Status codes mirror HTTP for clarity and tests. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503;
      error: string;
      fields?: FieldErrors;
    };

export const DEMO_READ_ONLY = "Demo is read-only — sign up to log your own workouts.";
