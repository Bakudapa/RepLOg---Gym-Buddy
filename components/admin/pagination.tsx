import { Button } from "@/components/ui/button";

type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  disabled?: boolean;
};

export function Pagination({ page, pageSize, total, onPage, disabled }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4">
      <p className="text-sm text-muted">
        Page <span className="num text-fg">{Math.min(page, pages)}</span> of{" "}
        <span className="num text-fg">{pages}</span> ·{" "}
        <span className="num">{total}</span> total
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="text-sm"
          disabled={disabled || page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          className="text-sm"
          disabled={disabled || page >= pages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
