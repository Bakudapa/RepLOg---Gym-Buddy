"use client";

import { Repeat } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { ExerciseCombobox } from "@/components/calculator/exercise-combobox";
import { Button } from "@/components/ui/button";
import { describedBy, FieldError, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { parseDecimal } from "@/lib/number";
import { fieldErrors, setSchema, type SetInput } from "@/lib/validation/schemas";
import { exerciseKey, type LastSet } from "@/lib/workout/sets";

type SetFormProps = {
  recent: string[];
  /** Latest weight/reps per exercise key, used to pre-fill after picking an exercise. */
  lastByExercise: Record<string, LastSet>;
  onAdd: (input: SetInput) => void;
  onRepeat: () => void;
  canRepeat: boolean;
  disabled?: boolean;
  /** Opens the suggestion list upwards when the form is pinned to the bottom. */
  placement: "top" | "bottom" | "top-mobile";
};

type Field = "exerciseName" | "weightKg" | "reps";

/** Add-set form (FR24). Keeps its values after adding so the next set is one tap. */
export function SetForm({
  recent,
  lastByExercise,
  onAdd,
  onRepeat,
  canRepeat,
  disabled,
  placement,
}: SetFormProps) {
  const id = useId();
  const ids = {
    exerciseName: `${id}-exercise`,
    weightKg: `${id}-weight`,
    reps: `${id}-reps`,
  };
  const [exercise, setExercise] = useState("");
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const parsed = setSchema.safeParse({
    exerciseName: exercise,
    weightKg: parseDecimal(weight),
    reps: parseDecimal(reps),
  });
  const errors = submitted && !parsed.success ? fieldErrors<Field>(parsed.error) : {};

  function fillFrom(name: string) {
    const last = lastByExercise[exerciseKey(name)];
    if (!last) return;
    setWeight(String(last.weightKg));
    setReps(String(last.reps));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (!parsed.success) {
      const first = (["exerciseName", "weightKg", "reps"] as const).find(
        (field) => fieldErrors<Field>(parsed.error)[field],
      );
      if (first) document.getElementById(ids[first])?.focus();
      return;
    }
    onAdd(parsed.data);
    setSubmitted(false);
  }

  const numberInput = (field: "weightKg" | "reps") =>
    cn(inputClass(Boolean(errors[field])), "num text-center text-lg");

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      aria-label="Add a set"
      className="flex flex-col gap-3"
    >
      <div>
        <label htmlFor={ids.exerciseName} className="sr-only">
          Exercise
        </label>
        <ExerciseCombobox
          id={ids.exerciseName}
          value={exercise}
          onChange={setExercise}
          onSelect={fillFrom}
          recent={recent}
          placement={placement}
          disabled={disabled}
          invalid={Boolean(errors.exerciseName)}
          describedBy={describedBy(ids.exerciseName, errors.exerciseName)}
        />
        <FieldError id={`${ids.exerciseName}-error`} message={errors.exerciseName} />
      </div>

      <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
        <div>
          <label htmlFor={ids.weightKg} className="text-xs font-medium text-muted">
            kg
          </label>
          <input
            id={ids.weightKg}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            placeholder="0"
            disabled={disabled}
            value={weight}
            onChange={(event) => setWeight(event.target.value)}
            aria-invalid={Boolean(errors.weightKg) || undefined}
            aria-describedby={describedBy(ids.weightKg, errors.weightKg)}
            className={numberInput("weightKg")}
          />
        </div>
        <div>
          <label htmlFor={ids.reps} className="text-xs font-medium text-muted">
            reps
          </label>
          <input
            id={ids.reps}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            enterKeyHint="done"
            placeholder="0"
            disabled={disabled}
            value={reps}
            onChange={(event) => setReps(event.target.value)}
            aria-invalid={Boolean(errors.reps) || undefined}
            aria-describedby={describedBy(ids.reps, errors.reps)}
            className={numberInput("reps")}
          />
        </div>
        <div className="pt-4">
          <Button
            type="submit"
            variant="solid"
            disabled={disabled}
            className="min-h-12 px-5"
          >
            Add set
          </Button>
        </div>
      </div>
      <FieldError id={`${ids.weightKg}-error`} message={errors.weightKg} />
      <FieldError id={`${ids.reps}-error`} message={errors.reps} />

      <Button
        type="button"
        variant="secondary"
        onClick={onRepeat}
        disabled={disabled || !canRepeat}
        className="w-full text-sm"
      >
        <Repeat aria-hidden size={16} />
        Repeat last set
      </Button>
    </form>
  );
}
