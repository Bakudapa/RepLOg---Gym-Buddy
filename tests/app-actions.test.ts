import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAppClientMock } from "./helpers/mock-app-client";
import { createServiceMock } from "./helpers/mock-supabase";

const service = createServiceMock();
let app = createAppClientMock({ user: null });

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => service.client,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => app.client,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const actions = await import("@/app/app/actions");

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "a@example.com" };
const SESSION = "22222222-2222-4222-8222-222222222222";
const SET_ID = "33333333-3333-4333-8333-333333333333";
const validSet = { exerciseName: "Bench Press", weightKg: 80, reps: 8 };
const regular = { display_name: "Alice", is_demo: false };
const demo = { display_name: "Demo", is_demo: true };

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
  vi.stubEnv("RATE_LIMIT_SALT", "a-long-test-salt-value");
  service.rpc.mockReset().mockResolvedValue({
    data: [{ allowed: true, retry_after_seconds: 0 }],
    error: null,
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("guards shared by every /app write", () => {
  it("401 without a session", async () => {
    app = createAppClientMock({ user: null });
    expect(await actions.addSet(SESSION, validSet)).toMatchObject({
      ok: false,
      status: 401,
    });
    expect(await actions.deleteSet(SET_ID)).toMatchObject({ ok: false, status: 401 });
    expect(await actions.startWorkout(form({}))).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("403 for the demo account, before touching the database", async () => {
    app = createAppClientMock({ user: USER, profile: demo });
    const result = await actions.addSet(SESSION, validSet);
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      error: expect.stringMatching(/read-only/),
    });
    expect(app.calls.filter((call) => call.table === "workout_sets")).toHaveLength(0);
  });

  it("400 for invalid input", async () => {
    app = createAppClientMock({ user: USER, profile: regular });
    const result = await actions.addSet(SESSION, {
      exerciseName: "",
      weightKg: 80.3,
      reps: 0,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(Object.keys(result.fields ?? {}).sort()).toEqual([
        "exerciseName",
        "reps",
        "weightKg",
      ]);
    }
  });

  it("404 for ids that are not UUIDs", async () => {
    app = createAppClientMock({ user: USER, profile: regular });
    expect(await actions.addSet("not-a-uuid", validSet)).toMatchObject({ status: 404 });
    expect(await actions.updateSet("1; drop table", validSet)).toMatchObject({
      status: 404,
    });
  });

  it("rate limits per user id (120 per minute)", async () => {
    app = createAppClientMock({ user: USER, profile: regular });
    service.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 30 }],
      error: null,
    });
    expect(await actions.addSet(SESSION, validSet)).toMatchObject({
      ok: false,
      status: 429,
    });
    const args = service.rpc.mock.calls[0][1];
    expect(args).toMatchObject({ p_limit: 120, p_window_seconds: 60 });
    expect(args.p_key).toMatch(/^app-write:[0-9a-f]{64}$/);
  });
});

describe("addSet", () => {
  it("inserts with the session client and returns the set", async () => {
    const row = {
      id: SET_ID,
      session_id: SESSION,
      user_id: USER.id,
      exercise_name: "Bench Press",
      exercise_key: "bench press",
      weight_kg: 80,
      reps: 8,
      performed_at: "2026-10-30T10:00:00Z",
      created_at: "2026-10-30T10:00:00Z",
    };
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sets: [{ data: row }] },
    });
    const result = await actions.addSet(SESSION, {
      ...validSet,
      exerciseName: "  Bench Press ",
    });
    expect(result).toMatchObject({
      ok: true,
      data: { id: SET_ID, weightKg: 80, reps: 8 },
    });
    expect(app.calls).toContainEqual({
      table: "workout_sets",
      method: "insert",
      args: [
        { session_id: SESSION, exercise_name: "Bench Press", weight_kg: 80, reps: 8 },
      ],
    });
  });

  it("explains the 100-set cap", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: {
        workout_sets: [{ error: { code: "P0001", message: "set_limit_reached" } }],
      },
    });
    expect(await actions.addSet(SESSION, validSet)).toMatchObject({ status: 409 });
  });
});

describe("updateSet / deleteSet", () => {
  it("404 when RLS hides the set (another user's)", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sets: [{ data: null }] },
    });
    expect(await actions.updateSet(SET_ID, validSet)).toMatchObject({
      ok: false,
      status: 404,
    });
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sets: [{ data: null }] },
    });
    expect(await actions.deleteSet(SET_ID)).toMatchObject({ ok: false, status: 404 });
  });
});

describe("startWorkout", () => {
  it("opens the active workout instead of creating a second one", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sessions: [{ data: { id: SESSION } }] },
    });
    await expect(actions.startWorkout(form({ name: "" }))).rejects.toThrow(
      `REDIRECT:/app/workout/${SESSION}`,
    );
    expect(app.calls.some((call) => call.method === "insert")).toBe(false);
  });

  it("uses the client's default name when none is given", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sessions: [{ data: null }, { data: { id: SESSION } }] },
    });
    await expect(
      actions.startWorkout(form({ name: " ", defaultName: "Workout — 30 Oct" })),
    ).rejects.toThrow(`REDIRECT:/app/workout/${SESSION}`);
    expect(app.calls).toContainEqual({
      table: "workout_sessions",
      method: "insert",
      args: [{ name: "Workout — 30 Oct" }],
    });
  });

  it("400 for a name over 60 characters", async () => {
    app = createAppClientMock({ user: USER, profile: regular });
    expect(await actions.startWorkout(form({ name: "x".repeat(61) }))).toMatchObject({
      status: 400,
    });
  });
});

describe("finishWorkout", () => {
  it("discards a workout without sets", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: {
        workout_sessions: [{ data: { id: SESSION, ended_at: null } }, { error: null }],
        workout_sets: [{ count: 0 }],
      },
    });
    await expect(actions.finishWorkout(SESSION)).rejects.toThrow("REDIRECT:/app");
    expect(
      app.calls.some(
        (call) => call.table === "workout_sessions" && call.method === "delete",
      ),
    ).toBe(true);
  });

  it("ends a workout with sets and opens its summary", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: {
        workout_sessions: [{ data: { id: SESSION, ended_at: null } }, { error: null }],
        workout_sets: [{ count: 3 }],
      },
    });
    await expect(actions.finishWorkout(SESSION)).rejects.toThrow(
      `REDIRECT:/app/history/${SESSION}?finished=1`,
    );
    expect(
      app.calls.some(
        (call) => call.table === "workout_sessions" && call.method === "update",
      ),
    ).toBe(true);
  });

  it("404 for another user's workout", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sessions: [{ data: null }] },
    });
    expect(await actions.finishWorkout(SESSION)).toMatchObject({
      ok: false,
      status: 404,
    });
  });
});

describe("updateSession / deleteSession", () => {
  it("validates the name and notes", async () => {
    app = createAppClientMock({ user: USER, profile: regular });
    const result = await actions.updateSession(SESSION, {
      name: " ",
      notes: "x".repeat(501),
    });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(Object.keys(result.fields ?? {}).sort()).toEqual(["name", "notes"]);
  });

  it("stores trimmed values and clears empty notes", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sessions: [{ data: { id: SESSION } }] },
    });
    expect(
      await actions.updateSession(SESSION, { name: "  Leg day ", notes: "   " }),
    ).toEqual({ ok: true, data: undefined });
    expect(app.calls).toContainEqual({
      table: "workout_sessions",
      method: "update",
      args: [{ name: "Leg day", notes: null }],
    });
  });

  it("404 for another user's workout", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sessions: [{ data: null }] },
    });
    expect(await actions.updateSession(SESSION, { name: "x" })).toMatchObject({
      status: 404,
    });
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sessions: [{ data: null }] },
    });
    expect(await actions.deleteSession(SESSION)).toMatchObject({ status: 404 });
  });

  it("deletes and returns to the history list", async () => {
    app = createAppClientMock({
      user: USER,
      profile: regular,
      results: { workout_sessions: [{ data: { id: SESSION } }] },
    });
    await expect(actions.deleteSession(SESSION)).rejects.toThrow("REDIRECT:/app/history");
  });

  it("is blocked for the demo account", async () => {
    app = createAppClientMock({ user: USER, profile: demo });
    expect(await actions.deleteSession(SESSION)).toMatchObject({ status: 403 });
  });
});
