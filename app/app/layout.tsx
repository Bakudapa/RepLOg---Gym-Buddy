import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppHeader, AppTabBar } from "@/components/app/app-nav";
import { DemoBanner } from "@/components/app/demo-banner";
import { requireUser } from "@/lib/auth/require-user";

// Always rendered per request: it reads the user's session.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RepLog",
  robots: { index: false, follow: false },
};

/** FR21: the proxy redirects first, but the layout checks the session itself too. */
export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const session = await requireUser();
  if (!session.ok) redirect("/login?next=/app");

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader displayName={session.profile.displayName} />
      {session.profile.isDemo ? <DemoBanner /> : null}
      <main className="container-page flex-1 py-6 md:py-10">{children}</main>
      <AppTabBar />
    </div>
  );
}
