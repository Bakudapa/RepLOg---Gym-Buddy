import { formatKg } from "@/lib/one-rep-max";
import { formatDuration } from "@/lib/workout/sets";
import type { PersonalRecord, SessionSummary as Summary } from "@/lib/workout/summary";
import { PrTag } from "./set-list";
import { StatCard, StatGrid } from "./stat-card";

const kindLabel: Record<PersonalRecord["kind"], string> = {
  e1rm: "Estimated 1RM",
  weight: "Heaviest weight",
};

/** FR25: duration, exercises, sets, volume, and the new records of one workout. */
export function SessionSummary({ summary }: { summary: Summary }) {
  return (
    <section aria-labelledby="summary-title">
      <h2 id="summary-title" className="sr-only">
        Summary
      </h2>
      <StatGrid>
        <StatCard label="Duration" value={formatDuration(summary.durationMinutes)} />
        <StatCard label="Exercises" value={summary.exerciseCount} />
        <StatCard label="Sets" value={summary.setCount} />
        <StatCard label="Volume" value={formatKg(summary.volumeKg)} unit="kg" />
      </StatGrid>

      <h3 className="mt-10 text-base font-semibold">New personal records</h3>
      {summary.records.length === 0 ? (
        <p className="mt-2 text-base text-muted">
          No new records this time. Consistency counts too.
        </p>
      ) : (
        <ul className="mt-3 border-t border-line">
          {summary.records.map((record) => (
            <li
              key={`${record.exerciseKey}-${record.kind}`}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line py-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                <PrTag />
                <span className="font-medium break-words">{record.exerciseName}</span>
                <span className="text-sm text-muted">{kindLabel[record.kind]}</span>
              </span>
              <span className="text-right">
                <span className="num text-lg">{formatKg(record.value)}</span>
                <span className="ml-1 text-sm text-muted">kg</span>
                <span className="num ml-3 text-sm text-muted">
                  {formatKg(record.weightKg)} × {record.reps}
                </span>
              </span>
              {record.lessReliable ? (
                <span className="w-full text-sm text-muted">
                  Estimate less reliable (more than 12 reps).
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
