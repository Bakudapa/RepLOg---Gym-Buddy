import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { LocalTime } from "@/components/ui/local-time";
import { requireUser } from "@/lib/auth/require-user";
import { formatKg } from "@/lib/one-rep-max";
import { exerciseHref } from "@/lib/workout/exercise-key";

export const metadata: Metadata = { title: "Exercises · RepLog" };

/** FR28: every exercise the user has logged, with last date and best estimate. */
export default async function ExercisesPage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login?next=/app/exercises");

  const { data, error } = await auth.supabase
    .from("exercise_summaries")
    .select("exercise_key, exercise_name, last_performed_at, best_e1rm, set_count")
    .order("last_performed_at", { ascending: false });
  if (error) throw new Error("Could not load exercises.");
  const exercises = data ?? [];

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Exercises</h1>
      {exercises.length === 0 ? (
        <div className="mt-8 border-y border-line py-10">
          <p className="text-base font-medium">No exercises yet</p>
          <p className="mt-2 text-base text-muted">
            Log a workout and your exercises and records appear here.
          </p>
          <Link href="/app" className={buttonClass("solid", "mt-6")}>
            Start a workout
          </Link>
        </div>
      ) : (
        <ul className="mt-8 border-t border-line md:grid md:grid-cols-2 md:gap-x-10 md:border-t-0">
          {exercises.map((exercise) => (
            <li key={exercise.exercise_key} className="border-b border-line md:border-t">
              <Link
                href={exerciseHref(exercise.exercise_key)}
                className="flex min-h-16 items-center justify-between gap-4 py-3 transition-colors duration-200 hover:bg-surface md:px-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {exercise.exercise_name}
                  </span>
                  <span className="block text-sm text-muted">
                    Last <LocalTime iso={exercise.last_performed_at} format="short" /> ·{" "}
                    <span className="num">{exercise.set_count}</span> sets
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="num text-lg">
                    {formatKg(Number(exercise.best_e1rm))}
                  </span>
                  <span className="ml-1 text-sm text-muted">kg</span>
                  <span className="block text-xs text-muted">best e1RM</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
