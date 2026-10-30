import type { Metadata } from "next";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/forms";
import { safeRedirect } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Log in · RepLog" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { next } = await props.searchParams;
  return (
    <AuthShell
      title="Log in"
      footer={
        <>
          <p>
            New to RepLog? <AuthLink href="/signup">Create an account</AuthLink>
          </p>
          <p>
            <AuthLink href="/forgot-password">Forgot your password?</AuthLink>
          </p>
        </>
      }
    >
      <LoginForm next={safeRedirect(Array.isArray(next) ? next[0] : next)} />
    </AuthShell>
  );
}
