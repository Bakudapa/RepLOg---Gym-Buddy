import type { Metadata } from "next";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/forms";

export const metadata: Metadata = { title: "Sign up · RepLog" };

export default function SignUpPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Free, no card needed. We'll send a link to confirm your email."
      footer={
        <p>
          Already have an account? <AuthLink href="/login">Log in</AuthLink>
        </p>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
