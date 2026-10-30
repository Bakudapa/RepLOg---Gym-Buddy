import type { ErrorBody } from "@/lib/http";

export type ApiResult =
  | { ok: true; status: number }
  | {
      ok: false;
      status: number;
      error?: ErrorBody["error"];
      retryAfterSeconds?: number;
    };

/** POSTs JSON and normalizes the response. Network failures come back as status 0. */
export async function postJson(url: string, body: unknown): Promise<ApiResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0 };
  }
  if (response.ok) return { ok: true, status: response.status };

  let error: ErrorBody["error"] | undefined;
  try {
    error = ((await response.json()) as ErrorBody).error;
  } catch {
    error = undefined;
  }
  const retryAfter = Number(response.headers.get("Retry-After"));
  return {
    ok: false,
    status: response.status,
    error,
    retryAfterSeconds:
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  };
}
