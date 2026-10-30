import { describe, expect, it } from "vitest";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createUserClientMock } from "./helpers/mock-user-client";

const user = { id: "11111111-1111-1111-1111-111111111111", email: "admin@example.com" };

const run = (options: Parameters<typeof createUserClientMock>[0]) => {
  const mock = createUserClientMock(options);
  return { mock, result: requireAdmin(async () => mock.client as never) };
};

describe("requireAdmin", () => {
  it("401 when nobody is signed in", async () => {
    const { result } = run({ user: null });
    expect(await result).toMatchObject({ ok: false, status: 401 });
  });

  it("401 when the session is invalid", async () => {
    const { result } = run({ user: null, userError: { message: "invalid JWT" } });
    expect(await result).toMatchObject({ ok: false, status: 401 });
  });

  it("401 when the client cannot be created (e.g. missing config)", async () => {
    const result = await requireAdmin(async () => {
      throw new Error("missing env");
    });
    expect(result).toMatchObject({ ok: false, status: 401 });
  });

  it("403 when the user is not in the admins table", async () => {
    const { result, mock } = run({ user, isAdmin: false });
    expect(await result).toMatchObject({ ok: false, status: 403 });
    expect(mock.client.from).toHaveBeenCalledWith("admins");
    expect(mock.calls).toContainEqual({
      table: "admins",
      method: "eq",
      args: ["user_id", user.id],
    });
  });

  it("403 (fail closed) when the admins lookup errors", async () => {
    const { result } = run({ user, isAdmin: true, adminError: { message: "db down" } });
    expect(await result).toMatchObject({ ok: false, status: 403 });
  });

  it("passes for an admin and returns the session client", async () => {
    const { result, mock } = run({ user, isAdmin: true });
    const value = await result;
    expect(value.ok).toBe(true);
    if (value.ok) {
      expect(value.user.id).toBe(user.id);
      expect(value.supabase).toBe(mock.client);
    }
  });
});
