import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceMock } from "./helpers/mock-supabase";

const service = createServiceMock();
const signInWithPassword = vi.fn();
const signOut = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => service.client,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({ auth: { signInWithPassword, signOut } }),
}));
vi.mock("@/lib/auth/client-ip", () => ({ getRequestIp: async () => "203.0.113.5" }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const { login, logout } = await import("@/app/admin/actions");

const form = (email: string, password: string) => {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
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
  signInWithPassword.mockReset().mockResolvedValue({ error: null });
  signOut.mockReset().mockResolvedValue({ error: null });
});

describe("login action", () => {
  it("redirects to /admin on success, with a normalized email", async () => {
    await expect(login({}, form(" Admin@Example.com ", "correct"))).rejects.toThrow(
      "REDIRECT:/admin",
    );
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "correct",
    });
  });

  it("returns the same message for a wrong password and an unknown email", async () => {
    signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const wrongPassword = await login({}, form("admin@example.com", "nope"));
    const unknownEmail = await login({}, form("ghost@example.com", "nope"));
    expect(wrongPassword.error).toBe("Invalid email or password.");
    expect(unknownEmail.error).toBe("Invalid email or password.");
  });

  it("returns the same message for invalid input without calling Supabase Auth", async () => {
    const result = await login({}, form("not-an-email", ""));
    expect(result.error).toBe("Invalid email or password.");
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("uses the admin-login limit (5 per 15 minutes) and reports the wait", async () => {
    service.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 600 }],
      error: null,
    });
    const result = await login({}, form("admin@example.com", "x"));
    expect(result.error).toBe("Too many attempts. Please try again in 10 minutes.");
    expect(signInWithPassword).not.toHaveBeenCalled();
    expect(service.rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_limit: 5, p_window_seconds: 900 }),
    );
  });

  it("fails closed when the rate limit cannot be checked", async () => {
    service.rpc.mockResolvedValue({ data: null, error: { message: "down" } });
    const result = await login({}, form("admin@example.com", "x"));
    expect(result.error).toMatch(/temporarily unavailable/);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("logout action", () => {
  it("signs out and redirects to the login page", async () => {
    await expect(logout()).rejects.toThrow("REDIRECT:/admin/login");
    expect(signOut).toHaveBeenCalled();
  });
});
