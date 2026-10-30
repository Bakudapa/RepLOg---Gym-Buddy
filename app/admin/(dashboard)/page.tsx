import { AdminTabs } from "@/components/admin/admin-tabs";
import { requireAdmin } from "@/lib/auth/require-admin";
import { FEEDBACK_CATEGORIES, type FeedbackCategory } from "@/lib/validation/schemas";

const categoryLabels: Record<FeedbackCategory, string> = {
  feature: "Feature ideas",
  critique: "Critiques",
  bug: "Bug reports",
};

async function getSummary() {
  const admin = await requireAdmin();
  if (!admin.ok) return null;
  const db = admin.supabase;
  const head = { count: "exact" as const, head: true };

  // Read with the admin's own session, so RLS applies.
  const [waitlist, feedback, ...categories] = await Promise.all([
    db.from("waitlist").select("id", head),
    db.from("feedback").select("id", head),
    ...FEEDBACK_CATEGORIES.map((category) =>
      db.from("feedback").select("id", head).eq("category", category),
    ),
  ]);

  return {
    waitlist: waitlist.count,
    feedback: feedback.count,
    categories: FEEDBACK_CATEGORIES.map((category, index) => ({
      category,
      count: categories[index]?.count ?? null,
    })),
  };
}

const formatCount = (value: number | null | undefined) =>
  typeof value === "number" ? value : "—";

export default async function AdminDashboardPage() {
  const summary = await getSummary();

  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>

      <dl className="mt-8 grid grid-cols-2 border-t border-line md:grid-cols-5">
        <Stat label="Waitlist" value={formatCount(summary?.waitlist)} />
        <Stat label="Feedback" value={formatCount(summary?.feedback)} />
        {summary?.categories.map(({ category, count }) => (
          <Stat
            key={category}
            label={categoryLabels[category]}
            value={formatCount(count)}
          />
        ))}
      </dl>

      <div className="mt-12">
        <AdminTabs />
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-b border-line py-4 pr-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="num mt-1 text-xl">{value}</dd>
    </div>
  );
}
