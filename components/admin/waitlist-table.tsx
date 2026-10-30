"use client";

import { useState } from "react";
import { formatDateTime } from "./format";
import { ListState } from "./list-state";
import { Pagination } from "./pagination";
import { useAdminList } from "./use-admin-list";

type WaitlistRow = { id: string; email: string; created_at: string };

export function WaitlistTable() {
  const [page, setPage] = useState(1);
  const { body, loading, error, reload } = useAdminList<WaitlistRow>(
    `/api/admin/waitlist?page=${page}`,
  );
  const rows = body?.data ?? [];

  return (
    <>
      <ListState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyText="No one on the waitlist yet."
        onRetry={reload}
      >
        {/* Phones: cards */}
        <ul className="border-t border-line md:hidden">
          {rows.map((row) => (
            <li key={row.id} className="border-b border-line py-4">
              <p className="text-base break-all">{row.email}</p>
              <p className="num mt-1 text-sm text-muted">
                {formatDateTime(row.created_at)}
              </p>
            </li>
          ))}
        </ul>
        {/* Tablet and up: table */}
        <table className="hidden w-full border-collapse text-left md:table">
          <caption className="sr-only">Waitlist sign-ups, newest first</caption>
          <thead>
            <tr className="border-b border-line-strong text-sm text-muted">
              <th scope="col" className="py-3 pr-4 font-medium">
                Email
              </th>
              <th scope="col" className="py-3 font-medium">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line">
                <td className="py-3 pr-4 text-base break-all">{row.email}</td>
                <td className="num py-3 text-sm whitespace-nowrap text-muted">
                  {formatDateTime(row.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListState>
      {body ? (
        <Pagination
          page={page}
          pageSize={body.pageSize}
          total={body.total}
          onPage={setPage}
          disabled={loading}
        />
      ) : null}
    </>
  );
}
