"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useRef, useState, useTransition } from "react";
import { addSet, deleteSet, finishWorkout, updateSet } from "@/app/app/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { SetInput } from "@/lib/validation/schemas";
import {
  exerciseKey,
  lastSetByExercise,
  totalVolume,
  type LastSet,
  type LoggedSet,
} from "@/lib/workout/sets";
import { formatKg } from "@/lib/one-rep-max";
import { ElapsedTime } from "./elapsed-time";
import { RestTimer, type RestTimerHandle } from "./rest-timer";
import { SetForm } from "./set-form";
import { SetList, type DisplaySet } from "./set-list";

type WorkoutLoggerProps = {
  session: { id: string; name: string; startedAt: string };
  sets: LoggedSet[];
  /** Latest weight/reps per exercise from earlier workouts. */
  history: Record<string, LastSet>;
  recent: string[];
  readOnly: boolean;
};

let tempCounter = 0;

/**
 * Active workout screen (FR24). Sets are added optimistically; a failed save stays
 * in the list with Retry. On phones the add-set form and rest timer are pinned to
 * the bottom of the screen for one-handed use.
 */
export function WorkoutLogger({
  session,
  sets,
  history,
  recent,
  readOnly,
}: WorkoutLoggerProps) {
  const timerRef = useRef<RestTimerHandle>(null);
  const [, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic<DisplaySet[], DisplaySet>(
    sets,
    (current, next) => [...current, next],
  );
  const [failed, setFailed] = useState<DisplaySet[]>([]);
  const [finishing, setFinishing] = useState(false);
  const [finishPending, setFinishPending] = useState(false);
  const [finishError, setFinishError] = useState<string>();

  const displayed = [...optimistic, ...failed];
  const saved = optimistic.filter((set) => !set.status);
  const lastSaved = [...saved]
    .sort((a, b) => (a.performedAt < b.performedAt ? -1 : 1))
    .at(-1);
  // Earlier workouts first, then this one, so this workout's latest set wins.
  const lastByExercise = { ...history, ...lastSetByExercise(saved) };

  function save(input: SetInput, retryOf?: DisplaySet) {
    timerRef.current?.start();
    const temp: DisplaySet = retryOf
      ? { ...retryOf, status: "pending", error: undefined }
      : {
          id: `temp-${++tempCounter}`,
          exerciseName: input.exerciseName,
          exerciseKey: exerciseKey(input.exerciseName),
          weightKg: input.weightKg,
          reps: input.reps,
          performedAt: new Date().toISOString(),
          status: "pending",
        };
    if (retryOf) setFailed((list) => list.filter((set) => set.id !== retryOf.id));
    startTransition(async () => {
      addOptimistic(temp);
      const result = await addSet(session.id, input);
      if (!result.ok)
        setFailed((list) => [
          ...list,
          { ...temp, status: "failed", error: result.error },
        ]);
    });
  }

  async function finish() {
    setFinishPending(true);
    const result = await finishWorkout(session.id);
    // On success the action redirects; we only get here on failure.
    setFinishPending(false);
    if (result && !result.ok) setFinishError(result.error);
  }

  const empty = saved.length === 0;

  return (
    <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-10 lg:gap-16">
      <div>
        <Link
          href="/app"
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-muted transition-colors duration-200 hover:text-fg"
        >
          <ArrowLeft aria-hidden size={16} />
          Dashboard
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight break-words">
              {session.name}
            </h1>
            <p className="mt-1 text-sm text-muted">
              <ElapsedTime startedAt={session.startedAt} /> ·{" "}
              <span className="num">{saved.length}</span>{" "}
              {saved.length === 1 ? "set" : "sets"} ·{" "}
              <span className="num">{formatKg(totalVolume(saved))}</span> kg
            </p>
          </div>
          <Button
            variant="secondary"
            className="shrink-0 text-sm"
            disabled={readOnly}
            onClick={() => {
              setFinishError(undefined);
              setFinishing(true);
            }}
          >
            Finish
          </Button>
        </div>

        <div className="mt-8 pb-4">
          <SetList
            sets={displayed}
            readOnly={readOnly}
            emptyText="No sets yet. Pick an exercise below and add your first set."
            onUpdate={(set, input) => updateSet(set.id, input)}
            onDelete={(set) => deleteSet(set.id)}
            onRetry={(set) =>
              save(
                {
                  exerciseName: set.exerciseName,
                  weightKg: set.weightKg,
                  reps: set.reps,
                },
                set,
              )
            }
            onDismiss={(set) =>
              setFailed((list) => list.filter((item) => item.id !== set.id))
            }
          />
        </div>
      </div>

      {/* Phones: pinned to the bottom. Tablet and up: a sticky side column. */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-line-strong bg-bg px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:top-24 md:bottom-auto md:mx-0 md:self-start md:border md:border-line md:p-5 md:rounded-lg">
        <RestTimer ref={timerRef} disabled={readOnly} />
        <div className="mt-3 border-t border-line pt-3">
          <SetForm
            recent={recent}
            lastByExercise={lastByExercise}
            onAdd={(input) => save(input)}
            onRepeat={() =>
              lastSaved &&
              save({
                exerciseName: lastSaved.exerciseName,
                weightKg: lastSaved.weightKg,
                reps: lastSaved.reps,
              })
            }
            canRepeat={Boolean(lastSaved)}
            disabled={readOnly}
            placement="top-mobile"
          />
        </div>
      </div>

      <ConfirmDialog
        open={finishing}
        title={empty ? "Discard empty workout?" : "Finish workout?"}
        description={
          empty
            ? "This workout has no sets, so it won't be saved."
            : `${saved.length} ${saved.length === 1 ? "set" : "sets"} will be saved to your history.`
        }
        confirmLabel={empty ? "Discard" : "Finish workout"}
        destructive={empty}
        pending={finishPending}
        error={finishError}
        onConfirm={finish}
        onCancel={() => setFinishing(false)}
      />
    </div>
  );
}
