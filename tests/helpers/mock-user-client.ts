import { vi } from "vitest";

type Result = { data?: unknown; error?: unknown; count?: number | null };

/**
 * Fake of the session-scoped Supabase client: auth.getUser, the admins lookup,
 * and a chainable query builder for list queries.
 */
export function createUserClientMock(options: {
  user?: { id: string; email?: string } | null;
  userError?: unknown;
  isAdmin?: boolean;
  adminError?: unknown;
  list?: Result;
}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];

  const builder = (table: string) => {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "range"]) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }
    chain.maybeSingle = async () =>
      options.adminError
        ? { data: null, error: options.adminError }
        : { data: options.isAdmin ? { user_id: options.user?.id } : null, error: null };
    chain.then = (resolve: (value: Result) => unknown) =>
      Promise.resolve(options.list ?? { data: [], error: null, count: 0 }).then(resolve);
    return chain;
  };

  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: options.user ?? null },
        error: options.userError ?? null,
      })),
    },
    from: vi.fn((table: string) => builder(table)),
  };
  return { client, calls };
}
