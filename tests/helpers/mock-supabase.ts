import { vi } from "vitest";

/** A tiny fake of the service client: `rpc` for rate limiting and `from().insert()`. */
export function createServiceMock() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({
    data: [{ allowed: true, retry_after_seconds: 0 }],
    error: null,
  });
  const from = vi.fn(() => ({ insert }));
  return { client: { rpc, from }, rpc, from, insert };
}

export function jsonRequest(
  body: unknown,
  init: { headers?: Record<string, string> } = {},
) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.7",
      ...init.headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
