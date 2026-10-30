"use client";

import { LoaderCircle, Play } from "lucide-react";
import { useActionState, useId } from "react";
import { startWorkout } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { describedBy, FieldError, inputClass } from "@/components/ui/field";
import type { ActionResult } from "@/lib/workout/action-result";
import { defaultSessionName } from "@/lib/workout/sets";

/** FR23: optional name, defaults to "Workout — {date}" in the device's time zone. */
export function StartWorkoutForm({ disabled }: { disabled?: boolean }) {
  const id = useId();
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    async (_previous, formData) => {
      formData.set("defaultName", defaultSessionName(new Date()));
      return startWorkout(formData);
    },
    null,
  );
  const fieldError = state && !state.ok ? state.fields?.name : undefined;
  const formError = state && !state.ok && !fieldError ? state.error : undefined;

  return (
    <form action={action} className="flex flex-col gap-3 md:flex-row md:items-start">
      <div className="md:flex-1">
        <label htmlFor={`${id}-name`} className="sr-only">
          Workout name (optional)
        </label>
        <input
          id={`${id}-name`}
          name="name"
          type="text"
          maxLength={60}
          placeholder="Workout name (optional)"
          disabled={disabled}
          aria-invalid={Boolean(fieldError) || undefined}
          aria-describedby={describedBy(`${id}-name`, fieldError)}
          className={inputClass(Boolean(fieldError))}
        />
        <FieldError id={`${id}-name-error`} message={fieldError} />
      </div>
      <Button
        type="submit"
        variant="solid"
        disabled={disabled || pending}
        className="min-h-12 px-6"
      >
        {pending ? (
          <LoaderCircle
            aria-hidden
            size={18}
            className="animate-spin motion-reduce:animate-none"
          />
        ) : (
          <Play aria-hidden size={18} />
        )}
        Start workout
      </Button>
      {formError ? (
        <p role="alert" className="text-sm font-medium md:basis-full">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
