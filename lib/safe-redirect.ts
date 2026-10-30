/**
 * Returns `target` only if it is an internal path, otherwise `fallback` (FR18).
 * Blocks open redirects such as "//evil.com", "/\\evil.com", "https://evil.com",
 * and "javascript:" URLs.
 */
export function safeRedirect(target: unknown, fallback = "/app"): string {
  if (typeof target !== "string" || target.length === 0 || target.length > 2048)
    return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.includes("\\"))
    return fallback;
  // Control characters can be used to smuggle a scheme past naive checks.
  if (/[\u0000-\u001f\u007f]/.test(target)) return fallback;
  try {
    const base = "http://internal.invalid";
    const url = new URL(target, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
