"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { limitAction } from "@/lib/auth/action-rate-limit";
import { getRequestIp } from "@/lib/auth/client-ip";
import { RECOVERY_COOKIE, type AuthFormState } from "@/lib/auth/form-state";
import { requireUser } from "@/lib/auth/require-user";
import { getSiteUrl } from "@/lib/env";
import { safeRedirect } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from "@/lib/validation/schemas";

const INVALID_LOGIN = "Invalid email or password.";
const CHECK_EMAIL = "Check your email to confirm your account.";
const RESET_SENT = "If an account exists, we've sent a reset link.";
const GENERIC = "Something went wrong. Please try again.";

const text = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

/** FR17. The same message is shown whether or not the email is already registered. */
export async function signUp(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = {
    displayName: text(formData, "displayName"),
    email: text(formData, "email"),
  };

  const limit = await limitAction("signup", await getRequestIp());
  if (!limit.ok) return { error: limit.message, values };

  const parsed = signUpSchema.safeParse({
    ...values,
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.displayName },
        emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/app`,
      },
    });
    // Only errors that say nothing about whether the email exists are shown.
    if (error?.code === "weak_password") {
      return { fields: { password: "Choose a stronger password." }, values };
    }
    if (error?.code === "over_email_send_rate_limit") {
      return { error: "Too many emails sent. Please try again later.", values };
    }
  } catch {
    return { error: GENERIC, values };
  }

  return { success: CHECK_EMAIL };
}

/** FR19 */
export async function logIn(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = text(formData, "email").slice(0, 254);
  const values = { email };

  const limit = await limitAction("login", await getRequestIp());
  if (!limit.ok) return { error: limit.message, values };

  const parsed = loginSchema.safeParse({
    email: email.trim().toLowerCase(),
    password: text(formData, "password"),
  });
  if (!parsed.success) return { error: INVALID_LOGIN, values };

  let failure: string | undefined;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error?.code === "email_not_confirmed") {
      failure =
        "Please confirm your email first. Check your inbox for the confirmation link.";
    } else if (error) {
      failure = INVALID_LOGIN;
    }
  } catch {
    failure = INVALID_LOGIN;
  }
  if (failure) return { error: failure, values };

  redirect(safeRedirect(text(formData, "next")));
}

/** FR20. Always the same message, so the form cannot be used to find accounts. */
export async function forgotPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { email: text(formData, "email") };

  const limit = await limitAction("forgot-password", await getRequestIp());
  if (!limit.ok) return { error: limit.message, values };

  const parsed = forgotPasswordSchema.safeParse(values);
  if (!parsed.success) return { fields: fieldErrors(parsed.error), values };

  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getSiteUrl()}/auth/callback?type=recovery&next=/reset-password`,
    });
  } catch {
    // Same response either way.
  }
  return { success: RESET_SENT };
}

/** FR20. Needs the recovery session set up by /auth/callback. */
export async function resetPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const cookieStore = await cookies();
  const session = await requireUser();
  if (!session.ok || cookieStore.get(RECOVERY_COOKIE)?.value !== "1") {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  // No extra rate limit: this already requires a valid, single-use recovery session.
  const parsed = resetPasswordSchema.safeParse({
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) return { fields: fieldErrors(parsed.error) };

  const { error } = await session.supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error?.code === "same_password") {
    return { fields: { password: "Use a password different from your old one." } };
  }
  if (error?.code === "weak_password") {
    return { fields: { password: "Choose a stronger password." } };
  }
  if (error) return { error: GENERIC };

  cookieStore.delete(RECOVERY_COOKIE);
  redirect("/app");
}

/** FR19: logout goes back to the landing page. */
export async function logOut(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Still leave the app even if Supabase is unreachable.
  }
  redirect("/");
}
