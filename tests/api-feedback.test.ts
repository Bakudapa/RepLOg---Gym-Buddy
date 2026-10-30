import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceMock, jsonRequest } from "./helpers/mock-supabase";

const mock = createServiceMock();
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => mock.client,
}));

const { POST } = await import("@/app/api/feedback/route");

const valid = {
  category: "feature",
  message: "Please add a plate calculator.",
  email: "",
  website: "",
};

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

describe("POST /api/feedback", () => {
  it.each(["feature", "critique", "bug"])(
    "201: stores %s feedback without email",
    async (category) => {
      const response = await POST(jsonRequest({ ...valid, category }));
      expect(response.status).toBe(201);
      expect(mock.from).toHaveBeenCalledWith("feedback");
      expect(mock.insert).toHaveBeenCalledWith({
        category,
        message: "Please add a plate calculator.",
        email: null,
      });
    },
  );

  it("201: stores a normalized optional email and trimmed message", async () => {
    const response = await POST(
      jsonRequest({
        ...valid,
        message: "  Love the idea, ship it  ",
        email: " Me@Example.com ",
      }),
    );
    expect(response.status).toBe(201);
    expect(mock.insert).toHaveBeenCalledWith({
      category: "feature",
      message: "Love the idea, ship it",
      email: "me@example.com",
    });
  });

  it("201 without storing when the honeypot is filled", async () => {
    const response = await POST(jsonRequest({ ...valid, website: "spam" }));
    expect(response.status).toBe(201);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("400: per-field errors", async () => {
    const response = await POST(
      jsonRequest({ category: "praise", message: "short", email: "nope" }),
    );
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(Object.keys(body.error.fields).sort()).toEqual([
      "category",
      "email",
      "message",
    ]);
  });

  it("400: malformed JSON", async () => {
    expect((await POST(jsonRequest("not json"))).status).toBe(400);
  });

  it("413: body over 10 KB", async () => {
    expect(
      (await POST(jsonRequest({ ...valid, message: "x".repeat(11 * 1024) }))).status,
    ).toBe(413);
  });

  it("415: wrong Content-Type", async () => {
    const request = jsonRequest(valid, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });
    expect((await POST(request)).status).toBe(415);
  });

  it("429: rate limited, with Retry-After", async () => {
    mock.rpc.mockResolvedValue({
      data: [{ allowed: false, retry_after_seconds: 240 }],
      error: null,
    });
    const response = await POST(jsonRequest(valid));
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("240");
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("uses the feedback rate limit (3 per 10 minutes)", async () => {
    await POST(jsonRequest(valid));
    expect(mock.rpc).toHaveBeenCalledWith(
      "check_rate_limit",
      expect.objectContaining({ p_limit: 3, p_window_seconds: 600 }),
    );
  });

  it("503 when the rate limit is unavailable, 500 on insert errors", async () => {
    mock.rpc.mockRejectedValueOnce(new Error("down"));
    expect((await POST(jsonRequest(valid))).status).toBe(503);
    mock.insert.mockResolvedValue({ error: { code: "XX000", message: "secret" } });
    const response = await POST(jsonRequest(valid));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret");
  });
});
