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
    <div className="min-w-0 border-t border-line py-4 pr-2">
      <dt className="text-sm text-muted">{label}</dt>
      {/* Value and unit may wrap onto two lines in narrow three-column grids. */}
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-1">
        <span className="num text-xl">{value}</span>
        {unit ? <span className="text-sm text-muted">{unit}</span> : null}
      </dd>
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-x-6 md:grid-cols-4">{children}</dl>;
}
