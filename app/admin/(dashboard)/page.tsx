import { FeedbackTable } from "@/components/admin/feedback-table";
import { StatCard } from "@/components/app/stat-card";
import { requireAdmin } from "@/lib/auth/require-admin";

/**
 * Aggregates only (FR16, PRD-app): the admin never sees users' emails, workouts,
 * or sets. The numbers come from get_admin_stats(), which checks is_admin() itself
 * and leaves out the demo account.
 */
async function getStats() {
  const admin = await requireAdmin();
  if (!admin.ok) return null;
  const { data, error } = await admin.supabase.rpc("get_admin_stats");
  if (error || !Array.isArray(data) || !data[0]) return null;
  return data[0];
}

const show = (value: number | undefined) =>
  typeof value === "number" ? Number(value) : "—";

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
      {stats ? null : (
        <p role="alert" className="mt-4 text-sm font-medium">
          Could not load the numbers. Try again in a moment.
        </p>
      )}

      <h2 className="mt-8 text-sm font-medium text-muted">
        Usage (demo account excluded)
      </h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 md:grid-cols-4">
        <StatCard label="Users" value={show(stats?.total_users)} />
        <StatCard label="New in 7 days" value={show(stats?.new_users_7d)} />
        <StatCard label="Workouts" value={show(stats?.total_sessions)} />
        <StatCard label="Sets" value={show(stats?.total_sets)} />
      </dl>

      <h2 className="mt-8 text-sm font-medium text-muted">Feedback</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 md:grid-cols-4">
        <StatCard
          label="Total"
          value={
            stats
              ? Number(stats.feedback_feature) +
                Number(stats.feedback_critique) +
                Number(stats.feedback_bug)
              : "—"
          }
        />
        <StatCard label="Feature ideas" value={show(stats?.feedback_feature)} />
        <StatCard label="Critiques" value={show(stats?.feedback_critique)} />
        <StatCard label="Bug reports" value={show(stats?.feedback_bug)} />
      </dl>

      <section aria-labelledby="feedback-title" className="mt-12">
        <h2 id="feedback-title" className="text-lg font-semibold">
          Feedback
        </h2>
        <div className="mt-4">
          <FeedbackTable />
        </div>
      </section>
    </>
  );
}
