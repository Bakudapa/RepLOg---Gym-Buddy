import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionProps = {
  id?: string;
  labelledBy: string;
  className?: string;
  children: ReactNode;
};

export function Section({ id, labelledBy, className, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="border-t border-line">
      <div className={cn("container-page reveal py-20 md:py-24 lg:py-28", className)}>
        {children}
      </div>
    </section>
  );
}

type SectionHeaderProps = {
  id: string;
  label: string;
  title: string;
  description?: string;
};

export function SectionHeader({ id, label, title, description }: SectionHeaderProps) {
  return (
    <header className="max-w-2xl">
      <p className="text-sm font-medium text-muted">{label}</p>
      <h2 id={id} className="mt-2 text-xl font-semibold tracking-tight">
        {title}
      </h2>
      {description ? <p className="mt-4 text-base text-muted">{description}</p> : null}
    </header>
  );
}
