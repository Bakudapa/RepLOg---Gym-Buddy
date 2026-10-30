import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceMock, jsonRequest } from "./helpers/mock-supabase";

const mock = createServiceMock();
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => mock.client,
}));

const { POST } = await import("@/app/api/waitlist/route");

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service");
  vi.stubEnv("RATE_LIMIT_SALT", "a-long-test-salt-value");
  mock.insert.mockReset().mockResolvedValue({ error: null });
  mock.rpc.mockReset().mockResolvedValue({
    data: [{ allowed: true, retry_after_seconds: 0 }],
    error: null,
  });
  mock.from.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/waitlist", () => {
  it("201: stores a normalized email", async () => {
    const response = await POST(
      jsonRequest({ email: "  Lifter@Example.COM ", website: "" }),
    );
    expect(response.status).toBe(201);
    expect(mock.from).toHaveBeenCalledWith("waitlist");
    expect(mock.insert).toHaveBeenCalledWith({ email: "lifter@example.com" });
  });

  it("201 without storing when the honeypot is filled", async () => {
    const response = await POST(
      jsonRequest({ email: "bot@example.com", website: "http://spam" }),
    );
    expect(response.status).toBe(201);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("400: invalid email, with a per-field message", async () => {
    const response = await POST(jsonRequest({ email: "not-an-email" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields.email).toBe("Please enter a valid email address.");
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("400: malformed JSON", async () => {
    const response = await POST(jsonRequest("{bad json"));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("409: email already registered (Postgres 23505)", async () => {
    mock.insert.mockResolvedValue({
      error: { code: "23505", message: "duplicate key value" },
    });
    const response = await POST(jsonRequest({ email: "lifter@example.com" }));
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("ALREADY_REGISTERED");
  });

  it("413: body over 10 KB", async () => {
    const response = await POST(
      jsonRequest({ email: "a@example.com", website: "x".repeat(11 * 1024) }),
    );
    expect(response.status).toBe(413);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("415: wrong Content-Type", async () => {
    const response = await POST(
      jsonRequest(
        { email: "a@example.com" },
        { headers: { "content-type": "text/plain" } },
      ),
    );
    expect(response.status).toBe(415);
    expect((await response.json()).error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
  });

  it("429: rate limited, with Retry-After", async () => {
    mock.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 1800 }],
      error: null,
    });
    const response = await POST(jsonRequest({ email: "a@example.com" }));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("1800");
    expect((await response.json()).error.code).toBe("RATE_LIMITED");
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("checks the rate limit before parsing JSON", async () => {
    mock.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 60 }],
      error: null,
    });
    expect((await POST(jsonRequest("{bad json"))).status).toBe(429);
  });

  it("503: fails closed when the rate limit cannot be checked", async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { message: "db down" } });
    const response = await POST(jsonRequest({ email: "a@example.com" }));
    expect(response.status).toBe(503);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("500: other database errors, without leaking details", async () => {
    mock.insert.mockResolvedValue({
      error: { code: "XX000", message: "internal secret detail" },
    });
    const response = await POST(jsonRequest({ email: "a@example.com" }));
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain("secret");
    expect(JSON.parse(text).error.code).toBe("INTERNAL_ERROR");
  });
});
