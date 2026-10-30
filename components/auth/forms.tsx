"use client";

import { forgotPassword, logIn, resetPassword, signUp } from "@/app/(auth)/actions";
import { login as adminLogin } from "@/app/admin/actions";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation/schemas";
import { AuthForm, type AuthField } from "./auth-form";

const email: AuthField = {
  name: "email",
  label: "Email",
  type: "email",
  autoComplete: "email",
  maxLength: 254,
};
const newPassword: AuthField = {
  name: "password",
  label: "Password",
  type: "password",
  autoComplete: "new-password",
  hint: "8–72 characters.",
  maxLength: 72,
};
const confirmPassword: AuthField = {
  name: "confirmPassword",
  label: "Confirm password",
  type: "password",
  autoComplete: "new-password",
  maxLength: 72,
};

export function SignUpForm() {
  return (
    <AuthForm
      action={signUp}
      schema={signUpSchema}
      fields={[
        {
          name: "displayName",
          label: "Display name",
          type: "text",
          autoComplete: "nickname",
          maxLength: 40,
        },
        email,
        newPassword,
        confirmPassword,
      ]}
      submitLabel="Create account"
      pendingLabel="Creating account…"
    />
  );
}

export function LoginForm({ next }: { next: string }) {
  return (
    <AuthForm
      action={logIn}
      schema={loginSchema}
      fields={[
        { ...email, autoComplete: "username" },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "current-password",
          maxLength: 128,
        },
      ]}
      submitLabel="Log in"
      pendingLabel="Logging in…"
      hidden={{ next }}
    />
  );
}

export function ForgotPasswordForm() {
  return (
    <AuthForm
      action={forgotPassword}
      schema={forgotPasswordSchema}
      fields={[email]}
      submitLabel="Send reset link"
      pendingLabel="Sending…"
    />
  );
}

export function ResetPasswordForm() {
  return (
    <AuthForm
      action={resetPassword}
      schema={resetPasswordSchema}
      fields={[
        { ...newPassword, label: "New password" },
        { ...confirmPassword, label: "Confirm new password" },
      ]}
      submitLabel="Set new password"
      pendingLabel="Saving…"
    />
  );
}

export function AdminLoginForm() {
  return (
    <AuthForm
      action={adminLogin}
      schema={loginSchema}
      fields={[
        { ...email, autoComplete: "username" },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "current-password",
          maxLength: 128,
        },
      ]}
      submitLabel="Sign in"
      pendingLabel="Signing in…"
    />
  );
}
