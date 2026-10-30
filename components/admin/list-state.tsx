import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ListStateProps = {
  loading: boolean;
  error?: string;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
  children: ReactNode;
};

/** Loading, error, and empty states shared by the admin lists. */
export function ListState({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
  children,
}: ListStateProps) {
  if (error) {
    return (
      <div role="alert" className="border-y border-line py-8">
        <p className="text-base">{error}</p>
        <Button variant="secondary" className="mt-4 text-sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }
  if (empty && !loading) {
    return <p className="border-y border-line py-8 text-base text-muted">{emptyText}</p>;
  }
  return (
    <div
      aria-busy={loading}
      className={loading ? "opacity-60 transition-opacity duration-200" : undefined}
    >
      {empty ? (
        <p className="border-y border-line py-8 text-base text-muted">Loading…</p>
      ) : (
        children
      )}
    </div>
  );
}
