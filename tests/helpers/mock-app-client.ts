import { vi } from "vitest";

type Result = { data?: unknown; error?: unknown; count?: number | null };

/**
 * Fake session client for /app Server Actions. `results[table]` is a list of
 * results handed out in order, one per awaited query on that table.
 */
export function createAppClientMock(options: {
  user?: { id: string; email?: string } | null;
  profile?: { display_name: string; is_demo: boolean } | null;
  results?: Record<string, Result[]>;
}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const queues = Object.fromEntries(
    Object.entries(options.results ?? {}).map(([table, list]) => [table, [...list]]),
  );

  const builder = (table: string) => {
    const chain: Record<string, unknown> = {};
    const next = (): Result => {
      if (table === "profiles") return { data: options.profile ?? null, error: null };
      return queues[table]?.shift() ?? { data: null, error: null };
    };
    for (const method of [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "neq",
      "is",
      "order",
      "limit",
      "range",
    ]) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }
    chain.single = async () => next();
    chain.maybeSingle = async () => next();
    chain.then = (resolve: (value: Result) => unknown) =>
      Promise.resolve(next()).then(resolve);
    return chain;
  };

  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: options.user ?? null }, error: null })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn((table: string) => builder(table)),
  };
  return { client, calls };
}
