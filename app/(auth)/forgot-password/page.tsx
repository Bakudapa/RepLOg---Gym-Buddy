import type { Metadata } from "next";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Reset password · RepLog" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email you signed up with and we'll send you a reset link."
      footer={
        <p>
          <AuthLink href="/login">Back to log in</AuthLink>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
