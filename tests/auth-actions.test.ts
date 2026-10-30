import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceMock } from "./helpers/mock-supabase";

const service = createServiceMock();
const auth = {
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
};
const cookieJar = new Map<string, string>();
const cookieStore = {
  get: (name: string) =>
    cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined,
  set: vi.fn((name: string, value: string) => cookieJar.set(name, value)),
  delete: vi.fn((name: string) => cookieJar.delete(name)),
};

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => service.client,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth,
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }),
  }),
}));
vi.mock("@/lib/auth/client-ip", () => ({ getRequestIp: async () => "203.0.113.5" }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const actions = await import("@/app/(auth)/actions");
const { GET: callback } = await import("@/app/auth/callback/route");

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};

const signUpValues = {
  displayName: "Dafa",
  email: "Dafa@Example.com",
  password: "correct-horse",
  confirmPassword: "correct-horse",
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
  vi.stubEnv("RATE_LIMIT_SALT", "a-long-test-salt-value");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://replog.test");
  service.rpc.mockReset().mockResolvedValue({
    data: [{ allowed: true, retry_after_seconds: 0 }],
    error: null,
  });
  for (const fn of Object.values(auth))
    fn.mockReset().mockResolvedValue({ data: {}, error: null });
  auth.getUser.mockResolvedValue({
    data: { user: { id: "u1", email: "u@example.com" } },
    error: null,
  });
  cookieJar.clear();
});

describe("signUp", () => {
  it("shows the same message for a new and an already registered email", async () => {
    const fresh = await actions.signUp({}, form(signUpValues));
    // Supabase answers an existing email with an obfuscated success, not an error.
    const existing = await actions.signUp({}, form(signUpValues));
    expect(fresh).toEqual({ success: "Check your email to confirm your account." });
    expect(existing).toEqual(fresh);
  });

  it("sends the display name and a callback link", async () => {
    await actions.signUp({}, form(signUpValues));
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "dafa@example.com",
      password: "correct-horse",
      options: {
        data: { display_name: "Dafa" },
        emailRedirectTo: "https://replog.test/auth/callback?next=/app",
      },
    });
  });

  it("returns field errors without calling Supabase", async () => {
    const result = await actions.signUp(
      {},
      form({ ...signUpValues, password: "short", confirmPassword: "different" }),
    );
    expect(result.fields?.password).toBe("Use at least 8 characters.");
    expect(result.values).toEqual({ displayName: "Dafa", email: "Dafa@Example.com" });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords", async () => {
    const result = await actions.signUp(
      {},
      form({ ...signUpValues, confirmPassword: "something-else" }),
    );
    expect(result.fields?.confirmPassword).toBe("Passwords do not match.");
  });

  it("is rate limited at 5 per hour per IP", async () => {
    service.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 1200 }],
      error: null,
    });
    const result = await actions.signUp({}, form(signUpValues));
    expect(result.error).toBe("Too many attempts. Please try again in 20 minutes.");
    expect(service.rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_limit: 5, p_window_seconds: 3600 }),
    );
    expect(auth.signUp).not.toHaveBeenCalled();
  });
});

describe("logIn", () => {
  it("redirects to a safe next path", async () => {
    await expect(
      actions.logIn(
        {},
        form({ email: "u@example.com", password: "x", next: "/app/history" }),
      ),
    ).rejects.toThrow("REDIRECT:/app/history");
  });

  it("ignores an external next path", async () => {
    await expect(
      actions.logIn(
        {},
        form({ email: "u@example.com", password: "x", next: "//evil.com" }),
      ),
    ).rejects.toThrow("REDIRECT:/app");
  });

  it("returns the generic message for wrong credentials", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    const result = await actions.logIn(
      {},
      form({ email: "u@example.com", password: "x" }),
    );
    expect(result.error).toBe("Invalid email or password.");
  });

  it("explains an unconfirmed email", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: "email_not_confirmed" } });
    const result = await actions.logIn(
      {},
      form({ email: "u@example.com", password: "x" }),
    );
    expect(result.error).toMatch(/confirm your email/);
  });

  it("uses the login limit (10 per 15 minutes)", async () => {
    service.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 300 }],
      error: null,
    });
    await actions.logIn({}, form({ email: "u@example.com", password: "x" }));
    expect(service.rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_limit: 10, p_window_seconds: 900 }),
    );
  });
});

describe("forgotPassword", () => {
  it("always shows the same message", async () => {
    const ok = await actions.forgotPassword({}, form({ email: "u@example.com" }));
    auth.resetPasswordForEmail.mockResolvedValue({ error: { code: "user_not_found" } });
    const missing = await actions.forgotPassword(
      {},
      form({ email: "ghost@example.com" }),
    );
    expect(ok).toEqual({ success: "If an account exists, we've sent a reset link." });
    expect(missing).toEqual(ok);
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("u@example.com", {
      redirectTo: "https://replog.test/auth/callback?type=recovery&next=/reset-password",
    });
  });
});

describe("resetPassword", () => {
  const values = { password: "new-password-1", confirmPassword: "new-password-1" };

  it("refuses without a recovery session", async () => {
    const result = await actions.resetPassword({}, form(values));
    expect(result.error).toMatch(/invalid or has expired/);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("updates the password and clears the recovery flag", async () => {
    cookieJar.set("replog_recovery", "1");
    await expect(actions.resetPassword({}, form(values))).rejects.toThrow(
      "REDIRECT:/app",
    );
    expect(auth.updateUser).toHaveBeenCalledWith({ password: "new-password-1" });
    expect(cookieStore.delete).toHaveBeenCalledWith("replog_recovery");
  });
});

describe("GET /auth/callback", () => {
  const call = (query: string) =>
    callback(new Request(`https://replog.test/auth/callback?${query}`));

  it("exchanges the code and redirects to next", async () => {
    const response = await call("code=abc&next=/app/history");
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe("https://replog.test/app/history");
  });

  it("never redirects off-site", async () => {
    const response = await call("code=abc&next=//evil.com");
    expect(response.headers.get("location")).toBe("https://replog.test/app");
  });

  it("shows the error page for an invalid or expired code", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { code: "otp_expired" } });
    const response = await call("code=bad");
    expect(response.headers.get("location")).toBe("https://replog.test/auth/error");
    expect((await call("")).headers.get("location")).toBe(
      "https://replog.test/auth/error",
    );
  });

  it("supports token_hash links and flags recovery sessions", async () => {
    const response = await call("token_hash=th&type=recovery&next=/reset-password");
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "th", type: "recovery" });
    expect(response.headers.get("location")).toBe("https://replog.test/reset-password");
    expect(cookieJar.get("replog_recovery")).toBe("1");
  });
});

describe("demoLogin", () => {
  it("signs in with the server-side demo credentials and opens the app", async () => {
    vi.stubEnv("DEMO_USER_EMAIL", "demo@replog.test");
    vi.stubEnv("DEMO_USER_PASSWORD", "demo-secret");
    await expect(actions.demoLogin()).rejects.toThrow("REDIRECT:/app");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "demo@replog.test",
      password: "demo-secret",
    });
  });

  it("explains when the demo is not configured, without leaking why", async () => {
    vi.stubEnv("DEMO_USER_EMAIL", "");
    vi.stubEnv("DEMO_USER_PASSWORD", "");
    const result = await actions.demoLogin();
    expect(result.error).toBe(
      "The demo isn't available right now. Please try again later.",
    );
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("is rate limited at 20 per hour per IP", async () => {
    service.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 900 }],
      error: null,
    });
    const result = await actions.demoLogin();
    expect(result.error).toMatch(/Too many attempts/);
    expect(service.rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_limit: 20, p_window_seconds: 3600 }),
    );
  });
});
