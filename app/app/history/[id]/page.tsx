import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SessionDetail } from "@/components/app/session-detail";
import { requireUser } from "@/lib/auth/require-user";
import { uuidSchema } from "@/lib/validation/schemas";
import { getSession, getSessionSets } from "@/lib/workout/queries";
import { summarizeSession } from "@/lib/workout/summary";

export const metadata: Metadata = { title: "Workout · RepLog" };

/**
 * FR25 + FR27: summary and sets of one workout. Another user's id gives 404,
 * not 403, so the page does not reveal that the workout exists.
 */
export default async function SessionPage(props: PageProps<"/app/history/[id]">) {
  const { id } = await props.params;
  const { finished } = await props.searchParams;
  if (!uuidSchema.safeParse(id).success) notFound();

  const auth = await requireUser();
  if (!auth.ok) redirect(`/login?next=/app/history/${id}`);

  const session = await getSession(auth.supabase, id);
  if (!session) notFound();
  if (!session.ended_at) redirect(`/app/workout/${id}`);

  const sets = await getSessionSets(auth.supabase, id);
  const summary = summarizeSession(
    { startedAt: session.started_at, endedAt: session.ended_at },
    sets,
  );

  return (
    <SessionDetail
      session={{
        id: session.id,
        name: session.name,
        notes: session.notes,
        startedAt: session.started_at,
      }}
      sets={sets}
      summary={summary}
      justFinished={finished === "1"}
      readOnly={auth.profile.isDemo}
    />
  );
}
