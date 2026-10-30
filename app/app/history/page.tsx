import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { LocalTime } from "@/components/ui/local-time";
import { Pagination } from "@/components/ui/pagination";
import { requireUser } from "@/lib/auth/require-user";
import { formatKg } from "@/lib/one-rep-max";
import { pageQuerySchema } from "@/lib/validation/schemas";
import { durationMinutes, formatDuration } from "@/lib/workout/sets";

export const metadata: Metadata = { title: "History · RepLog" };

const PAGE_SIZE = 20;

/** FR27: finished workouts, newest first, 20 per page. */
export default async function HistoryPage(props: PageProps<"/app/history">) {
  const { page } = pageQuerySchema.parse(await props.searchParams);
  const auth = await requireUser();
  if (!auth.ok) redirect("/login?next=/app/history");

  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await auth.supabase
    .from("workout_session_summaries")
    .select("id, name, started_at, ended_at, set_count, volume_kg, pr_count", {
      count: "exact",
    })
    .not("ended_at", "is", null)
    .order("started_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  // Past the last page PostgREST answers PGRST103; show the empty page instead.
  if (error && error.code !== "PGRST103") throw new Error("Could not load history.");
  const sessions = error ? [] : (data ?? []);
  const total = count ?? 0;

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">History</h1>
      {total === 0 ? (
        <div className="mt-8 border-y border-line py-10">
          <p className="text-base font-medium">No workouts yet</p>
          <p className="mt-2 text-base text-muted">Finished workouts show up here.</p>
          <Link href="/app" className={buttonClass("solid", "mt-6")}>
            Start a workout
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-8 border-t border-line">
            {sessions.map((session) => (
              <li key={session.id} className="border-b border-line">
                <Link
                  href={`/app/history/${session.id}`}
                  className="grid min-h-16 gap-x-6 gap-y-1 py-3 transition-colors duration-200 hover:bg-surface md:grid-cols-[minmax(0,1fr)_6rem_5rem_7rem] md:items-center md:px-2"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{session.name}</span>
                    <span className="block text-sm text-muted">
                      <LocalTime iso={session.started_at} format="weekday" />
                      {session.pr_count > 0 ? (
                        <span className="ml-2 text-fg">
                          · <span className="num">{session.pr_count}</span> PR
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="num flex gap-4 text-sm text-muted md:contents">
                    <span className="md:text-right">
                      {formatDuration(
                        durationMinutes(
                          session.started_at,
                          session.ended_at ?? session.started_at,
                        ),
                      )}
                    </span>
                    <span className="md:text-right">
                      {session.set_count} {session.set_count === 1 ? "set" : "sets"}
                    </span>
                    <span className="md:text-right md:text-fg">
                      {formatKg(Number(session.volume_kg))} kg
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {sessions.length === 0 ? (
            <p className="mt-6 text-base text-muted">
              This page is empty.{" "}
              <Link href="/app/history" className="underline underline-offset-4">
                Go to the first page
              </Link>
              .
            </p>
          ) : null}
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            hrefFor={(target) =>
              target === 1 ? "/app/history" : `/app/history?page=${target}`
            }
          />
        </>
      )}
    </>
  );
}
