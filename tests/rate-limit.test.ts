import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  checkRateLimit,
  formatRetryMinutes,
  getClientIp,
  hashIp,
  RATE_LIMITS,
  RateLimitUnavailableError,
  rateLimitKey,
} from "@/lib/rate-limit";

const rpcReturning = (value: unknown) => ({ rpc: vi.fn().mockResolvedValue(value) });

describe("getClientIp", () => {
  it("uses the first x-forwarded-for value", () => {
    const headers = new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" });
    expect(getClientIp(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
    expect(getClientIp(new Headers())).toBe("unknown");
  });
});

describe("hashIp / rateLimitKey", () => {
  it("is SHA-256 of ip + salt, hex encoded", async () => {
    const expected = createHash("sha256").update("203.0.113.7salt-value").digest("hex");
    expect(await hashIp("203.0.113.7", "salt-value")).toBe(expected);
  });

  it("depends on the salt and never contains the raw IP", async () => {
    const a = await hashIp("203.0.113.7", "salt-a");
    const b = await hashIp("203.0.113.7", "salt-b");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(rateLimitKey("login", a)).toBe(`login:${a}`);
    expect(rateLimitKey("login", a)).not.toContain("203.0.113.7");
  });
});

describe("checkRateLimit", () => {
  it("calls the RPC with the hashed key and the configured limit", async () => {
    const client = rpcReturning({
      data: [{ allowed: true, retry_after_seconds: 0 }],
      error: null,
    });
    const result = await checkRateLimit(
      client as never,
      "feedback",
      "203.0.113.7",
      "salt",
    );
    expect(result).toEqual({ allowed: true, retryAfterSeconds: 0 });
    const hash = await hashIp("203.0.113.7", "salt");
    expect(client.rpc).toHaveBeenCalledWith("check_rate_limit", {
      p_key: `feedback:${hash}`,
      p_limit: RATE_LIMITS.feedback.limit,
      p_window_seconds: RATE_LIMITS.feedback.windowSeconds,
    });
  });

  it("returns retry-after when blocked", async () => {
    const client = rpcReturning({
      data: [{ allowed: false, retry_after_seconds: 120 }],
      error: null,
    });
    expect(await checkRateLimit(client as never, "login", "1.1.1.1", "s")).toEqual({
      allowed: false,
      retryAfterSeconds: 120,
    });
  });

  it("throws when the RPC errors, returns nothing, or rejects", async () => {
    const failing = [
      rpcReturning({ data: null, error: { message: "boom" } }),
      rpcReturning({ data: [], error: null }),
      { rpc: vi.fn().mockRejectedValue(new Error("network")) },
    ];
    for (const client of failing) {
      await expect(
        checkRateLimit(client as never, "login", "1.1.1.1", "s"),
      ).rejects.toBeInstanceOf(RateLimitUnavailableError);
    }
  });

  it("matches the PRD limits", () => {
    expect(RATE_LIMITS).toEqual({
      feedback: { limit: 3, windowSeconds: 600 },
      "admin-login": { limit: 5, windowSeconds: 900 },
      "admin-read": { limit: 60, windowSeconds: 60 },
      signup: { limit: 5, windowSeconds: 3600 },
      login: { limit: 10, windowSeconds: 900 },
      "forgot-password": { limit: 3, windowSeconds: 3600 },
      "demo-login": { limit: 20, windowSeconds: 3600 },
      "app-write": { limit: 120, windowSeconds: 60 },
      "delete-account": { limit: 3, windowSeconds: 3600 },
    });
  });
});

describe("userIdentifier", () => {
  it("keys signed-in actions on the user id, not the IP", async () => {
    const { userIdentifier } = await import("@/lib/rate-limit");
    const id = "11111111-1111-1111-1111-111111111111";
    expect(userIdentifier(id)).toBe(`user:${id}`);
    expect(
      rateLimitKey("app-write", await hashIp(userIdentifier(id), "s")),
    ).not.toContain(id);
  });
});

describe("formatRetryMinutes", () => {
  it("rounds up to whole minutes", () => {
    expect(formatRetryMinutes(30)).toBe("1 minute");
    expect(formatRetryMinutes(61)).toBe("2 minutes");
    expect(formatRetryMinutes(900)).toBe("15 minutes");
  });
});
