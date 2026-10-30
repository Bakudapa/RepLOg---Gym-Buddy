import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProgressChart } from "@/components/app/progress-chart";
import { PrTag } from "@/components/app/set-list";
import { LocalTime } from "@/components/ui/local-time";
import { requireUser } from "@/lib/auth/require-user";
import { cn } from "@/lib/cn";
import { estimateOneRepMax, formatKg } from "@/lib/one-rep-max";
import {
  PROGRESS_RANGES,
  progressRangeSchema,
  type ProgressRange,
} from "@/lib/validation/schemas";
import { rangeStart } from "@/lib/workout/chart";
import { exerciseHref, parseExerciseKey } from "@/lib/workout/exercise-key";
import { toLoggedSet } from "@/lib/workout/rows";
import type { LoggedSet } from "@/lib/workout/sets";
import { isLessReliable } from "@/lib/workout/summary";

export const metadata: Metadata = { title: "Progress · RepLog" };

const rangeLabels: Record<ProgressRange, string> = {
  "4w": "4 weeks",
  "12w": "12 weeks",
  all: "All",
};

/** FR28: chart, records, and recent sets for one exercise. */
export default async function ExercisePage(props: PageProps<"/app/exercises/[key]">) {
  const { key: segment } = await props.params;
  const key = parseExerciseKey(segment);
  if (!key) notFound();
  const { range } = progressRangeSchema.parse(await props.searchParams);

  const auth = await requireUser();
  if (!auth.ok) redirect(`/login?next=${encodeURIComponent(exerciseHref(key))}`);
  const db = auth.supabase;

  const summary = await db
    .from("exercise_summaries")
    .select("*")
    .eq("exercise_key", key)
    .maybeSingle();
  if (summary.error) throw new Error("Could not load the exercise.");
  if (!summary.data) notFound();

  const start = rangeStart(range, new Date());
  let bestsQuery = db
    .from("exercise_session_bests")
    .select("session_id, started_at, best_e1rm, has_e1rm_pr")
    .eq("exercise_key", key)
    .order("started_at", { ascending: true });
  if (start) bestsQuery = bestsQuery.gte("started_at", start.toISOString());

  const [bests, records, recent] = await Promise.all([
    bestsQuery,
    db
      .from("workout_set_records")
      .select("*")
      .eq("exercise_key", key)
      .or("is_e1rm_pr.eq.true,is_weight_pr.eq.true")
      .order("performed_at", { ascending: false })
      .limit(30),
    db
      .from("workout_set_records")
      .select("*")
      .eq("exercise_key", key)
      .order("performed_at", { ascending: false })
      .limit(10),
  ]);
  if (bests.error || records.error || recent.error)
    throw new Error("Could not load progress.");

  const points = (bests.data ?? []).map((row) => ({
    date: row.started_at,
    value: Number(row.best_e1rm),
    isPr: row.has_e1rm_pr,
  }));
  const recordSets = (records.data ?? []).map(toLoggedSet);
  const e1rmRecords = recordSets.filter((set) => set.isE1rmPr).slice(0, 10);
  const weightRecords = recordSets.filter((set) => set.isWeightPr).slice(0, 10);
  const name = summary.data.exercise_name;

  return (
    <article>
      <Link
        href="/app/exercises"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-md px-2 text-sm text-muted transition-colors duration-200 hover:text-fg"
      >
        <ArrowLeft aria-hidden size={16} />
        Exercises
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight break-words">{name}</h1>
      <p className="mt-1 text-sm text-muted">
        Best estimated 1RM{" "}
        <span className="num text-fg">{formatKg(Number(summary.data.best_e1rm))} kg</span>{" "}
        · heaviest{" "}
        <span className="num text-fg">
          {formatKg(Number(summary.data.best_weight_kg))} kg
        </span>
      </p>

      <section aria-labelledby="chart-title" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="chart-title" className="text-lg font-semibold">
            Estimated 1RM
          </h2>
          <nav
            aria-label="Range"
            className="flex rounded-md border border-line-strong p-1"
          >
            {PROGRESS_RANGES.map((option) => (
              <Link
                key={option}
                href={
                  option === "12w"
                    ? exerciseHref(key)
                    : `${exerciseHref(key)}?range=${option}`
                }
                aria-current={option === range ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium transition-colors duration-200",
                  option === range ? "bg-fg text-bg" : "text-fg hover:bg-surface",
                )}
              >
                {rangeLabels[option]}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-6">
          {points.length >= 2 ? (
            <ProgressChart points={points} exerciseName={name} />
          ) : (
            <p className="border-y border-line py-8 text-base text-muted">
              {points.length === 1
                ? "Only one session in this range. The chart appears once you have logged this exercise in two sessions."
                : "No sessions in this range."}
            </p>
          )}
        </div>
      </section>

      <div className="mt-12 grid gap-12 md:grid-cols-2 md:gap-10">
        <RecordList title="Estimated 1RM records" sets={e1rmRecords} kind="e1rm" />
        <RecordList title="Heaviest weight records" sets={weightRecords} kind="weight" />
      </div>

      <section aria-labelledby="recent-title" className="mt-12">
        <h2 id="recent-title" className="text-lg font-semibold">
          Last 10 sets
        </h2>
        <ul className="mt-3 border-t border-line">
          {(recent.data ?? []).map(toLoggedSet).map((set) => (
            <li
              key={set.id}
              className="flex min-h-12 items-center justify-between gap-4 border-b border-line"
            >
              <span className="num text-base">
                {formatKg(set.weightKg)} × {set.reps}
              </span>
              <span className="flex items-center gap-3 text-sm text-muted">
                {set.isE1rmPr || set.isWeightPr ? <PrTag /> : null}
                <LocalTime iso={set.performedAt} format="short" />
              </span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function RecordList({
  title,
  sets,
  kind,
}: {
  title: string;
  sets: LoggedSet[];
  kind: "e1rm" | "weight";
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {sets.length === 0 ? (
        <p className="mt-2 text-base text-muted">
          No records yet. The first set of an exercise sets the baseline.
        </p>
      ) : (
        <ul className="mt-3 border-t border-line">
          {sets.map((set) => (
            <li
              key={set.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line py-3"
            >
              <span>
                <span className="num text-lg">
                  {formatKg(
                    kind === "e1rm"
                      ? (set.e1rm ?? estimateOneRepMax(set.weightKg, set.reps))
                      : set.weightKg,
                  )}
                </span>
                <span className="ml-1 text-sm text-muted">kg</span>
                <span className="num ml-3 text-sm text-muted">
                  {formatKg(set.weightKg)} × {set.reps}
                </span>
              </span>
              <LocalTime
                iso={set.performedAt}
                format="date"
                className="text-sm text-muted"
              />
              {kind === "e1rm" && isLessReliable(set.reps) ? (
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
