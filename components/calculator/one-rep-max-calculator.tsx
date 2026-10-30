"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { describedBy, Field, inputClass } from "@/components/ui/field";
import { estimateOneRepMax, formatKg, percentageTable } from "@/lib/one-rep-max";
import {
  fieldErrors,
  oneRepMaxSchema,
  type OneRepMaxInput,
} from "@/lib/validation/schemas";
import { ExerciseCombobox } from "./exercise-combobox";
import { HistoryList } from "./history-list";
import { useHistory } from "./use-history";

type FieldName = keyof OneRepMaxInput;
type Result = OneRepMaxInput & { oneRepMax: number };

/** Empty strings become NaN so the schema reports them as missing numbers. */
const toNumber = (value: string) =>
  value.trim() === "" ? Number.NaN : Number(value.replace(",", "."));

export function OneRepMaxCalculator() {
  const id = useId();
  const ids = { exercise: `${id}-exercise`, weight: `${id}-weight`, reps: `${id}-reps` };
  const [values, setValues] = useState({ exercise: "", weight: "", reps: "" });
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [result, setResult] = useState<Result | null>(null);
  const history = useHistory();

  const parsed = oneRepMaxSchema.safeParse({
    exercise: values.exercise,
    weight: toNumber(values.weight),
    reps: toNumber(values.reps),
  });
  const errors = parsed.success ? {} : fieldErrors<FieldName>(parsed.error);
  const visibleError = (field: FieldName) => (touched[field] ? errors[field] : undefined);

  const set = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    // Show errors once the user has typed something, not on the first keystroke into an empty field.
    if (value !== "") setTouched((current) => ({ ...current, [field]: true }));
  };
  const touch = (field: FieldName) =>
    setTouched((current) => ({ ...current, [field]: true }));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.success) {
      setTouched({ exercise: true, weight: true, reps: true });
      return;
    }
    const input = parsed.data;
    const oneRepMax = estimateOneRepMax(input.weight, input.reps);
    setResult({ ...input, oneRepMax });
    history.add({ ...input, oneRepMax });
  }

  function loadEntry(entry: Result) {
    setValues({
      exercise: entry.exercise,
      weight: String(entry.weight),
      reps: String(entry.reps),
    });
    setTouched({});
    setResult({ ...entry, oneRepMax: estimateOneRepMax(entry.weight, entry.reps) });
  }

  return (
    <div className="grid gap-12 md:grid-cols-2 md:gap-10 lg:gap-16">
      <div className="flex flex-col gap-12">
        <form
          noValidate
          onSubmit={onSubmit}
          aria-label="1RM calculator"
          className="flex flex-col gap-6"
        >
          <Field id={ids.exercise} label="Exercise" error={visibleError("exercise")}>
            <ExerciseCombobox
              id={ids.exercise}
              value={values.exercise}
              onChange={(value) => set("exercise", value)}
              onBlur={() => values.exercise !== "" && touch("exercise")}
              invalid={Boolean(visibleError("exercise"))}
              describedBy={describedBy(ids.exercise, visibleError("exercise"))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field
              id={ids.weight}
              label="Weight (kg)"
              hint="1–500, steps of 0.5"
              error={visibleError("weight")}
            >
              <input
                id={ids.weight}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="next"
                className={`${inputClass(Boolean(visibleError("weight")))} num`}
                value={values.weight}
                aria-invalid={Boolean(visibleError("weight")) || undefined}
                aria-describedby={describedBy(ids.weight, visibleError("weight"), true)}
                onChange={(event) => set("weight", event.target.value)}
                onBlur={() => touch("weight")}
              />
            </Field>
            <Field id={ids.reps} label="Reps" hint="1–12" error={visibleError("reps")}>
              <input
                id={ids.reps}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                enterKeyHint="done"
                className={`${inputClass(Boolean(visibleError("reps")))} num`}
                value={values.reps}
                aria-invalid={Boolean(visibleError("reps")) || undefined}
                aria-describedby={describedBy(ids.reps, visibleError("reps"), true)}
                onChange={(event) => set("reps", event.target.value)}
                onBlur={() => touch("reps")}
              />
            </Field>
          </div>

          <Button
            type="submit"
            disabled={!parsed.success}
            className="w-full md:w-auto md:self-start"
          >
            Calculate 1RM
          </Button>
        </form>

        <HistoryList
          entries={history.entries}
          onSelect={loadEntry}
          onRemove={history.remove}
          onClear={history.clear}
        />
      </div>

      <ResultPanel result={result} />
    </div>
  );
}

function ResultPanel({ result }: { result: Result | null }) {
  return (
    <div
      aria-live="polite"
      className="md:row-start-1 md:col-start-2 md:border-l md:border-line md:pl-10 lg:pl-16"
    >
      {result ? (
        <>
          <p className="text-base">
            Estimated 1RM for{" "}
            <span className="font-semibold break-words">{result.exercise}</span>:
          </p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="num text-display font-medium text-accent">
              {formatKg(result.oneRepMax)}
            </span>
            <span className="text-lg text-muted">kg</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            From{" "}
            <span className="num">
              {formatKg(result.weight)} kg × {result.reps}
            </span>{" "}
            {result.reps === 1 ? "rep" : "reps"}, Epley formula.
          </p>
          <table className="mt-8 w-full border-collapse text-left">
            <caption className="mb-3 text-left text-sm font-medium">
              Training weights
            </caption>
            <thead>
              <tr className="border-b border-line-strong text-sm text-muted">
                <th scope="col" className="py-2 font-medium">
                  % of 1RM
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Weight
                </th>
              </tr>
            </thead>
            <tbody>
              {percentageTable(result.oneRepMax).map((row) => (
                <tr key={row.percent} className="num border-b border-line text-base">
                  <th scope="row" className="py-2 font-normal">
                    {row.percent}%
                  </th>
                  <td className="py-2 text-right">{formatKg(row.weight)} kg</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <div className="flex h-full min-h-40 flex-col justify-center rounded-md border border-dashed border-line-strong p-6">
          <p className="text-base font-medium">Your estimate will appear here</p>
          <p className="mt-2 text-sm text-muted">
            Pick an exercise, enter the weight and reps of a recent hard set, then
            calculate.
          </p>
        </div>
      )}
    </div>
  );
}
