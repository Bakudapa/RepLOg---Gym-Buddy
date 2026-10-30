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
