import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { WorkoutLogger } from "@/components/app/workout-logger";
import { requireUser } from "@/lib/auth/require-user";
import { uuidSchema } from "@/lib/validation/schemas";
import { getLoggingHints, getSession, getSessionSets } from "@/lib/workout/queries";

export const metadata: Metadata = { title: "Workout · RepLog" };

/** FR24: the active workout. Another user's id is a 404, like any unknown id. */
export default async function WorkoutPage(props: PageProps<"/app/workout/[id]">) {
  const { id } = await props.params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const auth = await requireUser();
  if (!auth.ok) redirect(`/login?next=/app/workout/${id}`);

  const session = await getSession(auth.supabase, id);
  if (!session) notFound();
  if (session.ended_at) redirect(`/app/history/${id}`);

  const [sets, hints] = await Promise.all([
    getSessionSets(auth.supabase, id),
    getLoggingHints(auth.supabase, id),
  ]);

  return (
    <WorkoutLogger
      session={{ id: session.id, name: session.name, startedAt: session.started_at }}
      sets={sets}
      history={hints.lastByExercise}
      recent={hints.recent}
      readOnly={auth.profile.isDemo}
    />
  );
}
