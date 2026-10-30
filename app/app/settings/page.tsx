import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  DeleteAccount,
  DisplayNameForm,
  LogoutButton,
} from "@/components/app/settings-forms";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Settings · RepLog" };

/** FR29 */
export default async function SettingsPage() {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login?next=/app/settings");
  const readOnly = auth.profile.isDemo;

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>

      <section aria-labelledby="profile-title" className="mt-8 border-t border-line pt-6">
        <h2 id="profile-title" className="text-lg font-semibold">
          Profile
        </h2>
        <div className="mt-4">
          <DisplayNameForm initial={auth.profile.displayName} readOnly={readOnly} />
        </div>
        <dl className="mt-6">
          <dt className="text-sm font-medium">Email</dt>
          <dd className="mt-1 text-base break-all text-muted">{auth.user.email}</dd>
        </dl>
        {readOnly ? (
          <p className="mt-4 text-sm text-muted">
            The demo account can&apos;t be changed.
          </p>
        ) : null}
      </section>

      <section
        aria-labelledby="session-title"
        className="mt-10 border-t border-line pt-6"
      >
        <h2 id="session-title" className="text-lg font-semibold">
          Session
        </h2>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </section>

      <section aria-labelledby="danger-title" className="mt-10 border-t border-line pt-6">
        <h2 id="danger-title" className="text-lg font-semibold">
          Delete account
        </h2>
        <p className="mt-2 text-base text-muted">
          Deletes your account and all your workouts, sets, and records. You&apos;ll need
          your password.
        </p>
        <div className="mt-4">
          <DeleteAccount readOnly={readOnly} />
        </div>
      </section>
    </div>
  );
}
