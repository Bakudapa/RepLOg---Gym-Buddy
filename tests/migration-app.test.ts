import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** Static checks on 0002_app.sql. The behaviour itself is checked in supabase/tests/app-checks.sql. */
const sql = readFileSync("supabase/migrations/0002_app.sql", "utf8")
  .replace(/--.*$/gm, "")
  .toLowerCase();
const policies = sql.match(/create policy[\s\S]*?;/g) ?? [];

describe("0002_app.sql", () => {
  it("drops the waitlist", () => {
    expect(sql).toContain("drop table if exists public.waitlist");
    expect(sql).toContain("drop function if exists public.get_waitlist_count()");
  });

  it("enables RLS on every new table", () => {
    for (const table of ["profiles", "workout_sessions", "workout_sets"]) {
      expect(sql).toMatch(
        new RegExp(`alter table public\\.${table}\\s+enable row level security`),
      );
    }
  });

  it("only grants anon the set counter", () => {
    const anonGrants = sql.match(/grant[^;]*\banon\b[^;]*;/g) ?? [];
    expect(anonGrants).toHaveLength(1);
    expect(anonGrants[0]).toContain("get_total_sets_logged");
    for (const policy of policies) expect(policy).toMatch(/to authenticated/);
  });

  it("blocks the demo account on every write policy", () => {
    const writes = policies.filter((policy) => /for (insert|update|delete)/.test(policy));
    expect(writes).toHaveLength(7);
    for (const policy of writes)
      expect(policy).toContain("not (select public.is_demo())");
  });

  it("scopes every policy to the signed-in user", () => {
    for (const policy of policies) expect(policy).toMatch(/= \(select auth\.uid\(\)\)/);
  });

  it("uses security_invoker for every view", () => {
    const views = sql.match(/create view [\s\S]*?\bas\b/g) ?? [];
    expect(views).toHaveLength(4);
    for (const view of views) expect(view).toContain("security_invoker = true");
  });

  it("locks the search_path of every security definer function", () => {
    const definers = sql.match(/security definer[^\n]*/g) ?? [];
    expect(definers.length).toBeGreaterThanOrEqual(6);
    for (const line of definers) expect(line).toContain("set search_path = ''");
  });

  it("does not let users write user_id or is_demo", () => {
    expect(sql).toContain(
      "grant update (display_name) on table public.profiles to authenticated",
    );
    expect(sql).toMatch(
      /grant insert \(session_id, exercise_name, weight_kg, reps\) on table public\.workout_sets/,
    );
    expect(sql).not.toMatch(
      /grant (insert|update) on table public\.(profiles|workout_sessions|workout_sets) to authenticated/,
    );
  });
});
