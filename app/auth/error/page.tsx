import type { Metadata } from "next";
import { AuthLink, AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Link not valid · RepLog",
  robots: { index: false },
};

export default function AuthErrorPage() {
  return (
    <AuthShell
      title="This link didn't work"
      description="The link is invalid or has expired. Links can only be used once, and only for a limited time."
      footer={
        <p>
          <AuthLink href="/login">Back to log in</AuthLink>
        </p>
      }
    >
      {null}
    </AuthShell>
  );
}
