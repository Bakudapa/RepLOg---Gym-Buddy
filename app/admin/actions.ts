"use server";

import { redirect } from "next/navigation";
import { getRequestIp } from "@/lib/auth/client-ip";
import { getServerEnv } from "@/lib/env.server";
import { checkRateLimit, formatRetryMinutes } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { loginSchema } from "@/lib/validation/schemas";

export type LoginState = { error?: string; email?: string };

const INVALID = "Invalid email or password.";

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").slice(0, 254);

  // Rate limit first, so attempts count even when the input is invalid.
  try {
    const { RATE_LIMIT_SALT } = getServerEnv();
    const limit = await checkRateLimit(
      createSupabaseServiceClient(),
      "admin-login",
      await getRequestIp(),
      RATE_LIMIT_SALT,
    );
    if (!limit.allowed) {
      return {
        email,
        error: `Too many login attempts. Please try again in ${formatRetryMinutes(limit.retryAfterSeconds)}.`,
      };
    }
  } catch {
    // Fail closed (PRD 8.5).
    return {
      email,
      error: "Sign-in is temporarily unavailable. Please try again later.",
    };
  }

  const parsed = loginSchema.safeParse({
    email: email.trim().toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) return { email, error: INVALID };

  let signedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    signedIn = !error;
  } catch {
    signedIn = false;
  }
  // Same message whether the email exists or not.
  if (!signedIn) return { email, error: INVALID };

  redirect("/admin");
}

export async function logout(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Even if Supabase is unreachable, send the user to the login page.
  }
  redirect("/admin/login");
}
