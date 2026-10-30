import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Static checks on the migration: anon must never get write access. */
const sql = readFileSync("supabase/migrations/0001_init.sql", "utf8")
  .replace(/--.*$/gm, "")
  .toLowerCase();

describe("0001_init.sql", () => {
  it("enables RLS on every table", () => {
    for (const table of ["waitlist", "feedback", "admins", "rate_limits"]) {
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table}\\s+enable row level security`),
      );
    }
  });

  it("has no policy for anon and no insert/update/delete policies", () => {
    expect(sql).not.toMatch(/to\s+anon\b(?!,)/);
    expect(sql).not.toMatch(/for\s+(insert|update|delete|all)\b/);
    for (const policy of sql.match(/create policy[\s\S]*?;/g) ?? []) {
      expect(policy).toMatch(/for select to authenticated/);
    }
  });

  it("only lets anon execute get_waitlist_count", () => {
    const anonGrants = sql.match(/grant[^;]*\banon\b[^;]*;/g) ?? [];
    expect(anonGrants).toHaveLength(1);
    expect(anonGrants[0]).toContain("get_waitlist_count");
  });

  it("restricts check_rate_limit to service_role", () => {
    expect(sql).toMatch(
      /revoke execute on function public\.check_rate_limit\(text, integer, integer\) from public, anon, authenticated/,
    );
  });
});
