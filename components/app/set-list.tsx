"use client";

import { Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FieldError, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { parseDecimal } from "@/lib/number";
import { formatKg } from "@/lib/one-rep-max";
import { fieldErrors, setSchema, type SetInput } from "@/lib/validation/schemas";
import type { ActionResult } from "@/lib/workout/action-result";
import {
  groupSetsByExercise,
  type LoggedSet,
  type NumberedSet,
} from "@/lib/workout/sets";

export type DisplaySet = LoggedSet & {
  /** Optimistic set that has not been confirmed yet, or one that failed to save. */
  status?: "pending" | "failed";
  error?: string;
};

type SetListProps = {
  sets: DisplaySet[];
  readOnly?: boolean;
  onUpdate: (set: LoggedSet, input: SetInput) => Promise<ActionResult>;
  onDelete: (set: LoggedSet) => Promise<ActionResult>;
  onRetry?: (set: DisplaySet) => void;
  onDismiss?: (set: DisplaySet) => void;
  emptyText?: string;
};

const iconButton =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-md text-muted transition-colors duration-200 hover:text-fg disabled:opacity-40";

export function PrTag({ label = "PR" }: { label?: string }) {
  return (
    <span className="rounded-sm border border-fg px-1.5 text-xs font-semibold text-fg">
      {label}
    </span>
  );
}

/**
 * Sets grouped per exercise with numbers, PR tags, inline edit, and delete with
 * confirmation (FR24, FR27).
 */
export function SetList({
  sets,
  readOnly,
  onUpdate,
  onDelete,
  onRetry,
  onDismiss,
  emptyText,
}: SetListProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<
    (NumberedSet<DisplaySet> & { groupName: string }) | null
  >(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const groups = groupSetsByExercise(sets);

  async function confirmDelete() {
    if (!deleting) return;
    setDeletePending(true);
    const result = await onDelete(deleting);
    setDeletePending(false);
    if (result.ok) {
      setDeleting(null);
      setDeleteError(undefined);
    } else {
      setDeleteError(result.error);
    }
  }

  if (groups.length === 0) {
    return (
      <p className="border-y border-line py-8 text-base text-muted">
        {emptyText ?? "No sets yet."}
      </p>
    );
  }

  return (
    <>
      <ol className="flex flex-col gap-8">
        {groups.map((group) => (
          <li key={group.exerciseKey}>
            <h3 className="text-base font-semibold break-words">{group.exerciseName}</h3>
            <ol className="mt-2 border-t border-line">
              {group.sets.map((set) =>
                editing === set.id ? (
                  <EditRow
                    key={set.id}
                    set={set}
                    onCancel={() => setEditing(null)}
                    onSave={async (input) => {
                      const result = await onUpdate(set, input);
                      if (result.ok) setEditing(null);
                      return result;
                    }}
                  />
                ) : (
                  <li
                    key={set.id}
                    className={cn(
                      "flex min-h-14 items-center gap-3 border-b border-line",
                      set.status === "pending" && "text-muted",
                    )}
                  >
                    <span className="num w-6 shrink-0 text-sm text-muted">
                      {set.number}
                    </span>
                    <span className="num text-lg">
                      {formatKg(set.weightKg)} <span className="text-muted">×</span>{" "}
                      {set.reps}
                    </span>
                    <span className="flex flex-1 items-center gap-2">
                      {set.isE1rmPr || set.isWeightPr ? <PrTag /> : null}
                      {set.status === "pending" ? (
                        <span className="text-sm">Saving…</span>
                      ) : null}
                      {set.status === "failed" ? (
                        <span className="text-sm font-medium text-fg">
                          {set.error ?? "Not saved"}
                        </span>
                      ) : null}
                    </span>
                    {set.status === "failed" ? (
                      <span className="flex">
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => onRetry?.(set)}
                          aria-label={`Retry saving set ${set.number}`}
                        >
                          <RotateCcw aria-hidden size={18} />
                        </button>
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => onDismiss?.(set)}
                          aria-label={`Discard set ${set.number}`}
                        >
                          <X aria-hidden size={18} />
                        </button>
                      </span>
                    ) : !readOnly && set.status !== "pending" ? (
                      <span className="flex">
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => setEditing(set.id)}
                          aria-label={`Edit set ${set.number} of ${group.exerciseName}`}
                        >
                          <Pencil aria-hidden size={18} />
                        </button>
                        <button
                          type="button"
                          className={iconButton}
                          onClick={() => {
                            setDeleteError(undefined);
                            setDeleting({ ...set, groupName: group.exerciseName });
                          }}
                          aria-label={`Delete set ${set.number} of ${group.exerciseName}`}
                        >
                          <Trash2 aria-hidden size={18} />
                        </button>
                      </span>
                    ) : null}
                  </li>
                ),
              )}
            </ol>
          </li>
        ))}
      </ol>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this set?"
        description={
          deleting ? (
            <>
              Set {deleting.number} of {deleting.groupName}:{" "}
              <span className="num text-fg">
                {formatKg(deleting.weightKg)} × {deleting.reps}
              </span>
            </>
          ) : null
        }
        confirmLabel="Delete set"
        destructive
        pending={deletePending}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}

function EditRow({
  set,
  onSave,
  onCancel,
}: {
  set: NumberedSet<DisplaySet>;
  onSave: (input: SetInput) => Promise<ActionResult>;
  onCancel: () => void;
}) {
  const id = useId();
  const [weight, setWeight] = useState(String(set.weightKg));
  const [reps, setReps] = useState(String(set.reps));
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = setSchema.safeParse({
      exerciseName: set.exerciseName,
      weightKg: parseDecimal(weight),
      reps: parseDecimal(reps),
    });
    if (!parsed.success) {
      const errors = fieldErrors<"weightKg" | "reps">(parsed.error);
      setError(errors.weightKg ?? errors.reps);
      return;
    }
    setPending(true);
    const result = await onSave(parsed.data);
    setPending(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <li className="border-b border-line py-2">
      <form
        onSubmit={submit}
        noValidate
        className="flex items-center gap-2"
        aria-label={`Edit set ${set.number}`}
      >
        <span className="num w-6 shrink-0 text-sm text-muted">{set.number}</span>
        <label htmlFor={`${id}-w`} className="sr-only">
          Weight in kg
        </label>
        <input
          id={`${id}-w`}
          type="text"
          inputMode="decimal"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          className={cn(inputClass(Boolean(error)), "num w-24 text-center")}
          autoFocus
        />
        <span className="text-muted">×</span>
        <label htmlFor={`${id}-r`} className="sr-only">
          Reps
        </label>
        <input
          id={`${id}-r`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={reps}
          onChange={(event) => setReps(event.target.value)}
          className={cn(inputClass(Boolean(error)), "num w-20 text-center")}
        />
        <span className="ml-auto flex">
          <button
            type="submit"
            className={iconButton}
            disabled={pending}
            aria-label="Save set"
          >
            <Check aria-hidden size={18} />
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={onCancel}
            disabled={pending}
            aria-label="Cancel editing"
          >
            <X aria-hidden size={18} />
          </button>
        </span>
      </form>
      <FieldError id={`${id}-error`} message={error} />
    </li>
  );
}
