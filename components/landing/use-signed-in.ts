"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// @supabase/ssr stores the session in a readable cookie, sometimes split into chunks (.0, .1).
const AUTH_COOKIE = /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/;

/**
 * True when the browser holds a Supabase session cookie. Only picks which links the
 * landing page shows, so the page can stay static; /app still checks the session itself.
 * False during server render and hydration.
 */
export function useSignedIn(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => AUTH_COOKIE.test(document.cookie),
    () => false,
  );
}
