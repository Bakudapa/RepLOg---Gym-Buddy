"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { deleteSet, updateSet } from "@/app/app/actions";
import { LocalTime } from "@/components/ui/local-time";
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
      <h1 className="mt-2 text-xl font-semibold tracking-tight break-words">
        {session.name}
      </h1>
      <p className="mt-1 text-sm text-muted">
        <LocalTime iso={session.startedAt} format="datetime" />
      </p>
      {session.notes ? (
        <p className="mt-4 max-w-prose text-base whitespace-pre-line">{session.notes}</p>
      ) : null}

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
    </article>
  );
}
