import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { RECOVERY_COOKIE } from "@/lib/auth/form-state";
import { safeRedirect } from "@/lib/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "recovery",
  "email",
  "email_change",
  "invite",
  "magiclink",
];

/**
 * FR18: turns the link in a confirmation or password reset email into a session.
 * Supports the PKCE `code` flow (default) and the `token_hash` flow (custom email
 * templates, works across devices). `next` must be an internal path.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const origin = url.origin;
  const next = safeRedirect(params.get("next"), "/app");
  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type");

  let ok = false;
  try {
    const supabase = await createSupabaseServerClient();
    if (code) {
      ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
    } else if (tokenHash && OTP_TYPES.includes(type as EmailOtpType)) {
      ok = !(
        await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as EmailOtpType,
        })
      ).error;
    }
  } catch {
    ok = false;
  }

  if (!ok) return NextResponse.redirect(new URL("/auth/error", origin));

  if (type === "recovery") {
    // Marks this browser as allowed to set a new password for the next 15 minutes.
    (await cookies()).set(RECOVERY_COOKIE, "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60,
    });
  }

  return NextResponse.redirect(new URL(next, origin));
}
