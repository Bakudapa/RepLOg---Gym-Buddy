import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/forms";
import { RECOVERY_COOKIE } from "@/lib/auth/form-state";
import { requireUser } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Set a new password · RepLog" };

/** Only usable with the recovery session that /auth/callback sets up (FR20). */
export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const session = await requireUser();
  const valid = session.ok && cookieStore.get(RECOVERY_COOKIE)?.value === "1";

  if (!valid) {
    return (
      <AuthShell
        title="Link expired"
        description="This reset link is invalid or has expired. Request a new one to continue."
        footer={
          <p>
            <AuthLink href="/forgot-password">Request a new link</AuthLink>
          </p>
        }
      >
        {null}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password">
      <ResetPasswordForm />
    </AuthShell>
  );
}
