"use client";

import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import { deleteSession, deleteSet, updateSession, updateSet } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { describedBy, FieldError, inputClass } from "@/components/ui/field";
import { LocalTime } from "@/components/ui/local-time";
import { cn } from "@/lib/cn";
import { fieldErrors, updateSessionSchema } from "@/lib/validation/schemas";
import type { LoggedSet } from "@/lib/workout/sets";
import type { SessionSummary as Summary } from "@/lib/workout/summary";
import { SessionSummary } from "./session-summary";
import { SetList } from "./set-list";

type SessionDetailProps = {
  session: { id: string; name: string; notes: string | null; startedAt: string };
  sets: LoggedSet[];
  summary: Summary;
  justFinished: boolean;
  readOnly: boolean;
};

/** Finished workout: summary (FR25) and editable sets (FR27). */
export function SessionDetail({
  session,
  sets,
  summary,
  justFinished,
  readOnly,
}: SessionDetailProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();

  async function confirmDelete() {
    setDeletePending(true);
    const result = await deleteSession(session.id);
    // Success redirects to the history list.
    setDeletePending(false);
    if (result && !result.ok) setDeleteError(result.error);
  }

  return (
    <article>
      <Link
        href={justFinished ? "/app" : "/app/history"}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeft aria-hidden size={16} />
        {justFinished ? "Dashboard" : "History"}
      </Link>
      {justFinished ? (
        <p role="status" className="mt-4 text-sm font-medium">
          Workout saved.
        </p>
      ) : null}
      {editing ? (
        <EditSessionForm session={session} onDone={() => setEditing(false)} />
      ) : (
        <>
          <div className="mt-2 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight break-words">
                {session.name}
              </h1>
              <p className="mt-1 text-sm text-muted">
                <LocalTime iso={session.startedAt} format="datetime" />
              </p>
            </div>
            {readOnly ? null : (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  aria-label="Edit name and notes"
                  className="inline-flex size-11 items-center justify-center rounded-md text-muted transition-colors duration-200 hover:text-fg"
                >
                  <Pencil aria-hidden size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError(undefined);
                    setDeleting(true);
                  }}
                  aria-label="Delete workout"
                  className="inline-flex size-11 items-center justify-center rounded-md text-muted transition-colors duration-200 hover:text-fg"
                >
                  <Trash2 aria-hidden size={18} />
                </button>
              </div>
            )}
          </div>
          {session.notes ? (
            <p className="mt-4 max-w-prose text-base whitespace-pre-line">
              {session.notes}
            </p>
          ) : null}
        </>
      )}

      <div className="mt-8">
        <SessionSummary summary={summary} />
      </div>

      <h2 className="mt-12 text-lg font-semibold">Sets</h2>
      <div className="mt-4">
        <SetList
          sets={sets}
          readOnly={readOnly}
          onUpdate={(set, input) => updateSet(set.id, input)}
          onDelete={(set) => deleteSet(set.id)}
          emptyText="This workout has no sets."
        />
      </div>

      <ConfirmDialog
        open={deleting}
        title="Delete this workout?"
        description={`"${session.name}" and its ${summary.setCount} ${summary.setCount === 1 ? "set" : "sets"} will be deleted for good.`}
        confirmLabel="Delete workout"
        destructive
        pending={deletePending}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(false)}
      />
    </article>
  );
}

function EditSessionForm({
  session,
  onDone,
}: {
  session: { id: string; name: string; notes: string | null };
  onDone: () => void;
}) {
  const id = useId();
  const [name, setName] = useState(session.name);
  const [notes, setNotes] = useState(session.notes ?? "");
  const [errors, setErrors] = useState<Partial<Record<"name" | "notes", string>>>({});
  const [formError, setFormError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = updateSessionSchema.safeParse({ name, notes });
    if (!parsed.success) {
      setErrors(fieldErrors<"name" | "notes">(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const result = await updateSession(session.id, { name, notes });
    setPending(false);
    if (result.ok) onDone();
    else {
      setErrors((result.fields ?? {}) as typeof errors);
      setFormError(result.fields ? undefined : result.error);
    }
  }

  return (
    <form
      onSubmit={submit}
      noValidate
      className="mt-4 flex max-w-xl flex-col gap-4"
      aria-label="Edit workout"
    >
      <div>
        <label htmlFor={`${id}-name`} className="block text-sm font-medium">
          Name
        </label>
        <input
          id={`${id}-name`}
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={Boolean(errors.name) || undefined}
          aria-describedby={describedBy(`${id}-name`, errors.name)}
          className={cn(inputClass(Boolean(errors.name)), "mt-2")}
          autoFocus
        />
        <FieldError id={`${id}-name-error`} message={errors.name} />
      </div>
      <div>
        <label htmlFor={`${id}-notes`} className="block text-sm font-medium">
          Notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          id={`${id}-notes`}
          value={notes}
          rows={3}
          onChange={(event) => setNotes(event.target.value)}
          aria-invalid={Boolean(errors.notes) || undefined}
          aria-describedby={[
            describedBy(`${id}-notes`, errors.notes),
            `${id}-notes-count`,
          ]
            .filter(Boolean)
            .join(" ")}
          className={cn(inputClass(Boolean(errors.notes)), "mt-2 resize-y")}
        />
        <p id={`${id}-notes-count`} className="num mt-1 text-xs text-muted">
          {notes.trim().length}/500
        </p>
        <FieldError id={`${id}-notes-error`} message={errors.notes} />
      </div>
      {formError ? (
        <p role="alert" className="text-sm font-medium">
          {formError}
        </p>
      ) : null}
      <div className="flex gap-3">
        <Button type="submit" variant="solid" disabled={pending}>
          Save
        </Button>
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
