import { z } from "zod";

/**
 * Public Supabase settings. Safe in the browser: the anon role has no table
 * privileges (see supabase/migrations/0001_init.sql).
 * Read with literal `process.env.NEXT_PUBLIC_*` so Next.js can inline them.
 */
export function getPublicEnv() {
  return z
    .object({
      NEXT_PUBLIC_SUPABASE_URL: z.url(),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    })
    .parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    });
}

/**
 * Public site URL for links in auth emails. Falls back to the Vercel deployment
 * URL, then to localhost for development.
 */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
