import type { Metadata } from "next";
import { redirect } from "next/navigation";
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

  return <main className="container-page min-h-dvh py-6 md:py-10">{children}</main>;
}
