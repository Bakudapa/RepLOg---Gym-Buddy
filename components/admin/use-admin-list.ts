"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type ListResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
};

type Loaded<T> =
  | { key: string; status: "ok"; body: ListResponse<T> }
  | { key: string; status: "error"; message: string };

/** Fetches one page from a GET /api/admin/* endpoint. */
export function useAdminList<T>(url: string) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded<T> | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const key = `${url}#${reloadToken}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then(async (response) => {
        if (response.status === 401) {
          // Session expired: back to sign in.
          router.replace("/admin/login");
          return;
        }
        if (!response.ok) {
          const message =
            response.status === 403
              ? "This account is not an admin."
              : response.status === 429
                ? "Too many requests. Wait a minute and try again."
                : "Could not load data. Please try again.";
          setLoaded({ key, status: "error", message });
          return;
        }
        setLoaded({
          key,
          status: "ok",
          body: (await response.json()) as ListResponse<T>,
        });
      })
      .catch((error: unknown) => {
        if ((error as Error).name === "AbortError") return;
        setLoaded({
          key,
          status: "error",
          message: "Could not load data. Please try again.",
        });
      });
    return () => controller.abort();
  }, [url, key, router]);

  return {
    loading: loaded?.key !== key,
    // Keep showing the previous page while the next one loads.
    body: loaded?.status === "ok" ? loaded.body : undefined,
    error: loaded?.key === key && loaded.status === "error" ? loaded.message : undefined,
    reload: () => setReloadToken((value) => value + 1),
  };
}
