import Link from "next/link";
import { StartWorkoutForm } from "@/components/app/start-workout-form";
import { buttonClass } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/require-user";
import { getActiveSession } from "@/lib/workout/queries";

export default async function DashboardPage() {
  const session = await requireUser();
  if (!session.ok) return null;
  const active = await getActiveSession(session.supabase);

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">
        Hi, {session.profile.displayName}
      </h1>
      <div className="mt-8">
        {active ? (
          <Link
            href={`/app/workout/${active.id}`}
            className={buttonClass("solid", "min-h-12 w-full md:w-auto")}
          >
            Continue workout: {active.name}
          </Link>
        ) : (
          <StartWorkoutForm disabled={session.profile.isDemo} />
        )}
      </div>
    </>
  );
}
