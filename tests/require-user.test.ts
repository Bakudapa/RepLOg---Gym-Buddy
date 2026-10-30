import { describe, expect, it, vi } from "vitest";
import { requireUser } from "@/lib/auth/require-user";

function client(
  user: { id: string; email?: string } | null,
  profile: unknown,
  userError: unknown = null,
) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: userError })) },
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }),
      }),
    })),
  };
}

describe("requireUser", () => {
  it("401 without a session", async () => {
    expect(await requireUser(async () => client(null, null) as never)).toMatchObject({
      ok: false,
      status: 401,
    });
  });

  it("401 when the token is rejected", async () => {
    const result = await requireUser(
      async () => client(null, null, { message: "bad jwt" }) as never,
    );
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("401 when the client cannot be created", async () => {
    const result = await requireUser(async () => {
      throw new Error("missing env");
    });
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("returns the user and profile", async () => {
    const mock = client(
      { id: "u1", email: "a@example.com" },
      { display_name: "Alice", is_demo: true },
    );
    const result = await requireUser(async () => mock as never);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile).toEqual({ displayName: "Alice", isDemo: true });
      expect(result.supabase).toBe(mock);
    }
    expect(mock.from).toHaveBeenCalledWith("profiles");
  });

  it("falls back to the email prefix when the profile row is missing", async () => {
    const result = await requireUser(
      async () => client({ id: "u1", email: "lifter@example.com" }, null) as never,
    );
    expect(result.ok && result.profile).toEqual({ displayName: "lifter", isDemo: false });
  });
});
