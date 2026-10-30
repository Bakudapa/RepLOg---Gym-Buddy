import "server-only";
import { z } from "zod";

/** Server-only secrets. Never prefixed with NEXT_PUBLIC_. */
export function getServerEnv() {
  return z
    .object({
      SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
      RATE_LIMIT_SALT: z.string().min(16),
    })
    .parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      RATE_LIMIT_SALT: process.env.RATE_LIMIT_SALT,
    });
}
