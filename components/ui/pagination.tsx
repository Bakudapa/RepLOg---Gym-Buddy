import Link from "next/link";
import { Button, buttonClass } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  /** Client-side paging (admin tables)… */
  onPage?: (page: number) => void;
  /** …or link-based paging for server-rendered lists (history). */
  hrefFor?: (page: number) => string;
  disabled?: boolean;
};

/** Previous / Next with "Page x of y". Works with callbacks or links. */
export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  hrefFor,
  disabled,
}: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const control = (target: number, label: string, enabled: boolean) => {
    if (hrefFor) {
      return enabled ? (
        <Link href={hrefFor(target)} className={buttonClass("secondary", "text-sm")}>
          {label}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={buttonClass("secondary", "pointer-events-none text-sm opacity-60")}
        >
          {label}
        </span>
      );
    }
    return (
      <Button
        variant="secondary"
        className="text-sm"
        disabled={disabled || !enabled}
        onClick={() => onPage?.(target)}
      >
        {label}
      </Button>
    );
  };

  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4">
      <p className="text-sm text-muted">
        Page <span className="num text-fg">{Math.min(page, pages)}</span> of{" "}
        <span className="num text-fg">{pages}</span> ·{" "}
        <span className="num">{total}</span> total
      </p>
      <div className="flex gap-2">
        {control(page - 1, "Previous", page > 1)}
        {control(page + 1, "Next", page < pages)}
      </div>
    </nav>
  );
}
