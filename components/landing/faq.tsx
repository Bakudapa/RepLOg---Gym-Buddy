import { Section, SectionHeader } from "@/components/ui/section";
import { faqItems } from "./faq-data";

export function Faq() {
  return (
    <Section id="faq" labelledBy="faq-title">
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
        <SectionHeader id="faq-title" label="FAQ" title="Questions, answered" />
        <dl className="border-b border-line">
          {faqItems.map((item) => (
            <div key={item.question} className="border-t border-line py-5">
              <dt className="text-base font-semibold">{item.question}</dt>
              <dd className="mt-2 text-base text-muted">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Section>
  );
}
