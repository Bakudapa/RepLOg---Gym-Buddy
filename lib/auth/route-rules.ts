/**
 * Where the proxy should send a request, or null to let it through (FR14, FR21).
 * Pure so it can be unit tested; proxy.ts supplies `signedIn`.
 */
export function routeRedirect(
  pathname: string,
  search: string,
  signedIn: boolean,
): string | null {
  const isAdminLogin = pathname === "/admin/login";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isApp = pathname === "/app" || pathname.startsWith("/app/");
  const isUserAuthPage = pathname === "/login" || pathname === "/signup";

  if (isAdminLogin) return signedIn ? "/admin" : null;
  if (isAdmin) return signedIn ? null : "/admin/login";
  if (isApp && !signedIn) return `/login?next=${encodeURIComponent(pathname + search)}`;
  if (isUserAuthPage && signedIn) return "/app";
  return null;
}
