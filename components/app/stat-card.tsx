import type { ReactNode } from "react";

/** A labelled number in the "log book" style: mono, tabular, 1 px rule above. */
export function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
}) {
  return (
    <div className="border-t border-line py-4 pr-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1">
        <span className="num text-xl">{value}</span>
        {unit ? <span className="ml-1 text-sm text-muted">{unit}</span> : null}
      </dd>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 md:grid-cols-4">{children}</dl>;
}
