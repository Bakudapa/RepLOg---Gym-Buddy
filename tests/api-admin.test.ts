import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceMock } from "./helpers/mock-supabase";
import { createUserClientMock } from "./helpers/mock-user-client";

const service = createServiceMock();
let userClient = createUserClientMock({ user: null });

vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => service.client,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => userClient.client,
}));

const waitlistRoute = await import("@/app/api/admin/waitlist/route");
const feedbackRoute = await import("@/app/api/admin/feedback/route");

const admin = { id: "11111111-1111-1111-1111-111111111111" };
const get = (path: string) =>
  new Request(`http://localhost${path}`, {
    headers: { "x-forwarded-for": "203.0.113.9" },
  });

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

describe("GET /api/admin/waitlist", () => {
  it("401 without a session", async () => {
    userClient = createUserClientMock({ user: null });
    const response = await waitlistRoute.GET(get("/api/admin/waitlist"));
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("403 for a signed-in non-admin", async () => {
    userClient = createUserClientMock({ user: admin, isAdmin: false });
    const response = await waitlistRoute.GET(get("/api/admin/waitlist"));
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("FORBIDDEN");
  });

  it("200 for an admin, newest first, 20 per page, read with the session client", async () => {
    const rows = [
      { id: "a", email: "a@example.com", created_at: "2026-10-30T07:00:00Z" },
    ];
    userClient = createUserClientMock({
      user: admin,
      isAdmin: true,
      list: { data: rows, error: null, count: 41 },
    });
    const response = await waitlistRoute.GET(get("/api/admin/waitlist?page=3"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: rows,
      page: 3,
      pageSize: 20,
      total: 41,
    });
    expect(userClient.calls).toContainEqual({
      table: "waitlist",
      method: "order",
      args: ["created_at", { ascending: false }],
    });
    expect(userClient.calls).toContainEqual({
      table: "waitlist",
      method: "range",
      args: [40, 59],
    });
    // The service role is only used for the rate limit RPC, never for reading data.
    expect(service.from).not.toHaveBeenCalled();
  });

  it("400 for an invalid page", async () => {
    userClient = createUserClientMock({ user: admin, isAdmin: true });
    expect((await waitlistRoute.GET(get("/api/admin/waitlist?page=0"))).status).toBe(400);
    expect((await waitlistRoute.GET(get("/api/admin/waitlist?page=abc"))).status).toBe(
      400,
    );
  });

  it("429 when over the admin-read limit", async () => {
    service.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 30 }],
      error: null,
    });
    const response = await waitlistRoute.GET(get("/api/admin/waitlist"));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
    expect(service.rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_limit: 60, p_window_seconds: 60 }),
    );
  });
});

describe("GET /api/admin/feedback", () => {
  it("401 / 403 like the waitlist endpoint", async () => {
    userClient = createUserClientMock({ user: null });
    expect((await feedbackRoute.GET(get("/api/admin/feedback"))).status).toBe(401);
    userClient = createUserClientMock({ user: admin, isAdmin: false });
    expect((await feedbackRoute.GET(get("/api/admin/feedback"))).status).toBe(403);
  });

  it("filters by category", async () => {
    userClient = createUserClientMock({
      user: admin,
      isAdmin: true,
      list: { data: [], error: null, count: 0 },
    });
    const response = await feedbackRoute.GET(
      get("/api/admin/feedback?page=1&category=bug"),
    );
    expect(response.status).toBe(200);
    expect(userClient.calls).toContainEqual({
      table: "feedback",
      method: "eq",
      args: ["category", "bug"],
    });
  });

  it("400 for an unknown category", async () => {
    userClient = createUserClientMock({ user: admin, isAdmin: true });
    const response = await feedbackRoute.GET(get("/api/admin/feedback?category=praise"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.fields.category).toBeDefined();
  });
});
