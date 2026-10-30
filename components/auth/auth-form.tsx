"use client";

import { Check, LoaderCircle } from "lucide-react";
import { useActionState, useId, useState, type FormEvent } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { describedBy, FieldError, inputClass } from "@/components/ui/field";
import type { AuthFormState } from "@/lib/auth/form-state";
import { fieldErrors } from "@/lib/validation/schemas";

export type AuthField = {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  hint?: string;
  maxLength?: number;
};

type AuthFormProps = {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  /** Same schema the action uses; checked on submit for faster feedback. */
  schema: z.ZodType;
  fields: AuthField[];
  submitLabel: string;
  pendingLabel: string;
  hidden?: Record<string, string>;
};

/**
 * Shared form for sign up, login (user and admin), forgot and reset password.
 * Validates with the shared Zod schema on the client, then the Server Action
 * validates again (the server is the source of truth).
 */
export function AuthForm({
  action,
  schema,
  fields,
  submitLabel,
  pendingLabel,
  hidden,
}: AuthFormProps) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, {});
  const [clientErrors, setClientErrors] = useState<Partial<Record<string, string>>>();
  const errors = clientErrors ?? state.fields ?? {};

  if (state.success) {
    return (
      <p
        role="status"
        className="flex items-start gap-3 border-t border-line-strong pt-6 text-base"
      >
        <Check aria-hidden size={20} className="mt-0.5 shrink-0" />
        {state.success}
      </p>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      event.preventDefault();
      const next = fieldErrors(parsed.error);
      setClientErrors(next);
      const first = fields.find((field) => next[field.name]);
      if (first) document.getElementById(`${id}-${first.name}`)?.focus();
      return;
    }
    setClientErrors(undefined);
  }

  const formErrorId = `${id}-form-error`;

  return (
    <form
      action={formAction}
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {fields.map((field) => {
        const fieldId = `${id}-${field.name}`;
        const error = errors[field.name];
        return (
          <div key={field.name}>
            <label htmlFor={fieldId} className="block text-sm font-medium">
              {field.label}
            </label>
            <input
              id={fieldId}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              autoCapitalize={field.type === "text" ? "words" : "none"}
              spellCheck={false}
              maxLength={field.maxLength}
              defaultValue={
                field.type === "password" ? undefined : state.values?.[field.name]
              }
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={
                describedBy(fieldId, error, Boolean(field.hint)) ??
                (state.error ? formErrorId : undefined)
              }
              className={`${inputClass(Boolean(error))} mt-2`}
            />
            {field.hint && !error ? (
              <p id={`${fieldId}-hint`} className="mt-2 text-sm text-muted">
                {field.hint}
              </p>
            ) : null}
            <FieldError id={`${fieldId}-error`} message={error} />
          </div>
        );
      })}
      <div role="alert">
        <FieldError id={formErrorId} message={state.error} />
      </div>
      <Button type="submit" variant="solid" disabled={pending} className="w-full">
        {pending ? (
          <LoaderCircle
            aria-hidden
            size={18}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : null}
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
