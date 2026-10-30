"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import type { FeedbackCategory } from "@/lib/validation/schemas";
import { formatDateTime } from "./format";
import { ListState } from "./list-state";
import { Pagination } from "./pagination";
import { useAdminList } from "./use-admin-list";

type FeedbackRow = {
  id: string;
  category: FeedbackCategory;
  message: string;
  email: string | null;
  created_at: string;
};

const labels: Record<FeedbackCategory, string> = {
  feature: "Feature idea",
  critique: "Critique",
  bug: "Bug report",
};

const filters: Array<{ value: FeedbackCategory | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "feature", label: labels.feature },
  { value: "critique", label: labels.critique },
  { value: "bug", label: labels.bug },
];

function CategoryTag({ category }: { category: FeedbackCategory }) {
  return (
    <span className="inline-flex rounded-sm border border-line-strong px-1.5 text-xs font-medium whitespace-nowrap">
      {labels[category]}
    </span>
  );
}

export function FeedbackTable() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState<FeedbackCategory | "">("");
  const query = new URLSearchParams({ page: String(page) });
  if (category) query.set("category", category);
  const { body, loading, error, reload } = useAdminList<FeedbackRow>(
    `/api/admin/feedback?${query}`,
  );
  const rows = body?.data ?? [];

  return (
    <>
      <div
        role="group"
        aria-label="Filter by category"
        className="mb-6 flex flex-wrap gap-2"
      >
        {filters.map((filter) => {
          const active = filter.value === category;
          return (
            <button
              key={filter.label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setCategory(filter.value);
                setPage(1);
              }}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-medium transition-colors duration-200",
                active
                  ? "border-fg bg-fg text-bg"
                  : "border-line-strong hover:bg-surface",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <ListState
        loading={loading}
        error={error}
        empty={rows.length === 0}
        emptyText="No feedback in this category yet."
        onRetry={reload}
      >
        {/* Phones: cards */}
        <ul className="border-t border-line md:hidden">
          {rows.map((row) => (
            <li key={row.id} className="border-b border-line py-4">
              <div className="flex items-center justify-between gap-3">
                <CategoryTag category={row.category} />
                <span className="num text-xs text-muted">
                  {formatDateTime(row.created_at)}
                </span>
              </div>
              <p className="mt-3 text-base break-words whitespace-pre-line">
                {row.message}
              </p>
              <p className="mt-2 text-sm break-all text-muted">{row.email ?? "—"}</p>
            </li>
          ))}
        </ul>
        {/* Tablet and up: table */}
        <table className="hidden w-full table-fixed border-collapse text-left md:table">
          <caption className="sr-only">Feedback, newest first</caption>
          <thead>
            <tr className="border-b border-line-strong text-sm text-muted">
              <th scope="col" className="w-32 py-3 pr-4 font-medium">
                Category
              </th>
              <th scope="col" className="py-3 pr-4 font-medium">
                Message
              </th>
              <th scope="col" className="w-48 py-3 pr-4 font-medium lg:w-56">
                Email
              </th>
              <th scope="col" className="w-36 py-3 font-medium lg:w-44">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <CategoryTag category={row.category} />
                </td>
                <td className="py-3 pr-4 text-base break-words whitespace-pre-line">
                  {row.message}
                </td>
                <td className="py-3 pr-4 text-sm break-all text-muted">
                  {row.email ?? "—"}
                </td>
                <td className="num py-3 text-sm text-muted">
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
