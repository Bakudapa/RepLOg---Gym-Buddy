import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routeRedirect } from "@/lib/auth/route-rules";

/**
 * Refreshes the Supabase session cookie and gates /admin/* and /app/* (FR14, FR21).
 * This is only the first gate: every page, Server Action, and API checks the session
 * (and the admin role) again on the server, and RLS checks it in the database.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let signedIn = false;
  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([header, value]) =>
            response.headers.set(header, value),
          );
        },
      },
    });

    // getUser() validates the token with Supabase Auth instead of trusting the cookie.
    try {
      const { data } = await supabase.auth.getUser();
      signedIn = Boolean(data.user);
    } catch {
      signedIn = false;
    }
  }

  const target = routeRedirect(pathname, search, signedIn);
  if (!target) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Keep any refreshed session cookies.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/app", "/app/:path*", "/login", "/signup"],
};
