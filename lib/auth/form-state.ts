/** Result of an auth Server Action, consumed by AuthForm through useActionState. */
export type AuthFormState = {
  /** Form-level error (wrong credentials, rate limited, …). */
  error?: string;
  /** Per-field errors from server-side validation. */
  fields?: Partial<Record<string, string>>;
  /** Non-secret values to put back into the form after an error. */
  values?: Record<string, string>;
  /** When set, the form is replaced by this confirmation message. */
  success?: string;
};

export const RECOVERY_COOKIE = "replog_recovery";
