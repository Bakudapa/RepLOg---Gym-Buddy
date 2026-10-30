import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/logout-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { requireAdmin } from "@/lib/auth/require-admin";

// Never prerender: the admin check must run on every request.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · RepLog",
  robots: { index: false, follow: false },
};

/**
 * Authorization for every admin page (FR15). The proxy only checks that someone is
 * signed in; the admin role is checked here, on the server, on every request.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  if (!admin.ok && admin.status === 401) redirect("/admin/login");

  if (!admin.ok) {
    return (
      <main className="container-page flex min-h-dvh items-center justify-center py-12">
        <div className="w-full max-w-md">
          <p className="num text-sm text-muted">403</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">No access</h1>
          <p className="mt-4 text-base text-muted">
            You are signed in, but this account is not an admin. Log out and sign in with
            an admin account.
          </p>
          <LogoutButton className="mt-8" />
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-bg pt-[env(safe-area-inset-top)]">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <p className="text-lg font-semibold tracking-tight">
            RepLog <span className="font-normal text-muted">admin</span>
          </p>
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden truncate text-sm text-muted md:inline">
              {admin.user.email}
            </span>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="container-page py-10 md:py-12">{children}</main>
    </>
  );
}
