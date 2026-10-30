import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin sign in · RepLog",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="container-page flex min-h-dvh items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <p className="text-lg font-semibold tracking-tight">RepLog</p>
        <h1 className="mt-6 text-xl font-semibold tracking-tight">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Accounts are created by the project owner. There is no sign-up.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
