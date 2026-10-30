import type { ReactNode } from "react";
import { Section, SectionHeader } from "@/components/ui/section";

export function CalculatorSection({ children }: { children?: ReactNode }) {
  return (
    <Section id="calculator" labelledBy="calculator-title">
      <SectionHeader
        id="calculator-title"
        label="1RM calculator"
        title="Estimate your one-rep max"
        description="Enter a recent set to estimate the most you could lift for a single rep, using the Epley formula."
      />
      <div className="mt-12">{children}</div>
    </Section>
  );
}
