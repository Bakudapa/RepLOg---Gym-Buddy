"use server";

import { redirect } from "next/navigation";
import { limitAction } from "@/lib/auth/action-rate-limit";
import { getRequestIp } from "@/lib/auth/client-ip";
import type { AuthFormState } from "@/lib/auth/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/validation/schemas";

const INVALID = "Invalid email or password.";

export async function login(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").slice(0, 254);
  const values = { email };

  // Rate limit first, so attempts count even when the input is invalid.
  const limit = await limitAction("admin-login", await getRequestIp());
  if (!limit.ok) return { error: limit.message, values };

  const parsed = loginSchema.safeParse({
    email: email.trim().toLowerCase(),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: INVALID, values };

  let signedIn = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    signedIn = !error;
  } catch {
    signedIn = false;
  }
  // Same message whether the email exists or not.
  if (!signedIn) return { error: INVALID, values };

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
