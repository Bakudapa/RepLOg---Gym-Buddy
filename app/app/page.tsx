import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PrTag } from "@/components/app/set-list";
import { StartWorkoutForm } from "@/components/app/start-workout-form";
import { WeekStats } from "@/components/app/week-stats";
import { buttonClass } from "@/components/ui/button";
import { LocalTime } from "@/components/ui/local-time";
import { requireUser } from "@/lib/auth/require-user";
import { estimateOneRepMax, formatKg } from "@/lib/one-rep-max";
import { exerciseHref } from "@/lib/workout/exercise-key";
import { getDashboardData } from "@/lib/workout/queries";
import { durationMinutes, formatDuration } from "@/lib/workout/sets";

export const metadata: Metadata = { title: "Dashboard · RepLog" };

/** FR22 */
export default async function DashboardPage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login?next=/app");
  const data = await getDashboardData(auth.supabase);
  const readOnly = auth.profile.isDemo;

  return (
    <div className="flex flex-col gap-12">
      <div>
        <h1 className="text-xl font-semibold tracking-tight break-words">
          Hi, {auth.profile.displayName}
        </h1>

        <div className="mt-6">
          {data.active ? (
            <section
              aria-labelledby="active-title"
              className="rounded-lg border border-fg p-5"
            >
              <p className="text-sm text-muted">Workout in progress</p>
              <h2 id="active-title" className="mt-1 text-lg font-semibold break-words">
                {data.active.name}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Started <LocalTime iso={data.active.started_at} format="time" /> ·{" "}
                <span className="num">{data.active.set_count}</span> sets
              </p>
              <Link
                href={`/app/workout/${data.active.id}`}
                className={buttonClass("solid", "mt-4 min-h-12 w-full md:w-auto")}
              >
                Continue workout
              </Link>
            </section>
          ) : data.isNewUser ? (
            <section aria-labelledby="first-title" className="border-y border-line py-8">
              <h2 id="first-title" className="text-lg font-semibold">
                Start your first workout
              </h2>
              <p className="mt-2 max-w-prose text-base text-muted">
                Pick an exercise, log your sets, and RepLog keeps the history, records,
                and progress for you.
              </p>
              <div className="mt-6">
                <StartWorkoutForm disabled={readOnly} />
              </div>
            </section>
          ) : (
            <StartWorkoutForm disabled={readOnly} />
          )}
        </div>
      </div>

      {data.isNewUser ? null : (
        <>
          <WeekStats sessions={data.week} />

          <div className="grid gap-12 md:grid-cols-2 md:gap-10">
            <section aria-labelledby="records-title">
              <h2 id="records-title" className="text-lg font-semibold">
                Recent records
              </h2>
              {data.records.length === 0 ? (
                <p className="mt-2 text-base text-muted">
                  Records appear once you beat an earlier set of the same exercise.
                </p>
              ) : (
                <ul className="mt-3 border-t border-line">
                  {data.records.map((set) => (
                    <li key={set.id} className="border-b border-line">
                      <Link
                        href={exerciseHref(set.exerciseKey)}
                        className="flex min-h-14 items-center justify-between gap-3 py-2 transition-colors duration-200 hover:bg-surface"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {set.exerciseName}
                          </span>
                          <span className="block text-sm text-muted">
                            <span className="num">
                              {formatKg(set.weightKg)} × {set.reps}
                            </span>{" "}
                            · <LocalTime iso={set.performedAt} format="short" />
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <PrTag />
                          <span className="text-right">
                            <span className="num text-base">
                              {formatKg(
                                set.isE1rmPr
                                  ? (set.e1rm ??
                                      estimateOneRepMax(set.weightKg, set.reps))
                                  : set.weightKg,
                              )}
                            </span>
                            <span className="ml-1 text-xs text-muted">
                              {set.isE1rmPr ? "e1RM" : "kg"}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="recent-title">
              <div className="flex items-baseline justify-between gap-4">
                <h2 id="recent-title" className="text-lg font-semibold">
                  Last workouts
                </h2>
                <Link
                  href="/app/history"
                  className="inline-flex min-h-11 items-center text-sm text-muted underline-offset-4 hover:text-fg hover:underline"
                >
                  All history
                </Link>
              </div>
              {data.recentSessions.length === 0 ? (
                <p className="mt-2 text-base text-muted">
                  Finished workouts show up here.
                </p>
              ) : (
                <ul className="mt-3 border-t border-line">
                  {data.recentSessions.map((session) => (
                    <li key={session.id} className="border-b border-line">
                      <Link
                        href={`/app/history/${session.id}`}
                        className="flex min-h-14 items-center justify-between gap-3 py-2 transition-colors duration-200 hover:bg-surface"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {session.name}
                          </span>
                          <span className="block text-sm text-muted">
                            <LocalTime iso={session.started_at} format="weekday" /> ·{" "}
                            {formatDuration(
                              durationMinutes(
                                session.started_at,
                                session.ended_at ?? session.started_at,
                              ),
                            )}
                          </span>
                        </span>
                        <span className="num shrink-0 text-right text-sm text-muted">
                          {session.set_count} sets
                          <span className="block text-fg">
                            {formatKg(Number(session.volume_kg))} kg
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
