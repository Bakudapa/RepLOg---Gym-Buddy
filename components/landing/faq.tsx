"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Section, SectionHeader } from "@/components/ui/section";
import { faqItems } from "./faq-data";

/** Accordion: one item open at a time (FR9). */
export function Faq() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Section id="faq" labelledBy="faq-title">
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
        <SectionHeader id="faq-title" label="FAQ" title="Questions, answered" />
        <div className="border-b border-line">
          {faqItems.map((item, index) => {
            const open = openIndex === index;
            const buttonId = `${baseId}-q${index}`;
            const panelId = `${baseId}-a${index}`;
            return (
              <div key={item.question} className="border-t border-line">
                <h3>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(open ? null : index)}
                    className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold"
                  >
                    {item.question}
                    <ChevronDown
                      aria-hidden
                      size={18}
                      className={`shrink-0 text-muted transition-transform duration-200 ease-standard ${open ? "rotate-180" : ""}`}
                    />
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!open}
                  className="pr-8 pb-5 text-base text-muted"
                >
                  {item.answer}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}
