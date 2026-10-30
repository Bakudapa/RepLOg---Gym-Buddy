"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, useId } from "react";
import { login, type LoginState } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { FieldError, inputClass } from "@/components/ui/field";

export function LoginForm() {
  const id = useId();
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  const errorId = `${id}-error`;

  return (
    <form
      action={action}
      className="flex flex-col gap-5"
      aria-describedby={state.error ? errorId : undefined}
    >
      <div>
        <label htmlFor={`${id}-email`} className="block text-sm font-medium">
          Email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          maxLength={254}
          defaultValue={state.email}
          aria-invalid={Boolean(state.error) || undefined}
          aria-describedby={state.error ? errorId : undefined}
          className={`${inputClass(Boolean(state.error))} mt-2`}
        />
      </div>
      <div>
        <label htmlFor={`${id}-password`} className="block text-sm font-medium">
          Password
        </label>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={128}
          aria-invalid={Boolean(state.error) || undefined}
          aria-describedby={state.error ? errorId : undefined}
          className={`${inputClass(Boolean(state.error))} mt-2`}
        />
      </div>
      <div role="alert">
        <FieldError id={errorId} message={state.error} />
      </div>
      <Button type="submit" variant="solid" disabled={pending} className="w-full">
        {pending ? (
          <LoaderCircle
            aria-hidden
            size={18}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : null}
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
