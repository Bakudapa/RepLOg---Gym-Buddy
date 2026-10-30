import { Section, SectionHeader } from "@/components/ui/section";

const steps = [
  {
    title: "Start a workout",
    description: "Give it a name or keep the default. One tap and you're logging.",
  },
  {
    title: "Log your sets",
    description: "Record each set as you go. The rest timer starts between sets.",
  },
  {
    title: "See your progress",
    description: "History, charts, and personal records update after every set.",
  },
];

export function HowItWorks() {
  return (
    <Section labelledBy="how-title">
      <SectionHeader
        id="how-title"
        label="How it works"
        title="Three steps, every session"
      />
      <ol className="mt-12 grid gap-x-10 md:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="border-t border-line py-6">
            <span className="num text-sm text-muted">
              {index + 1}/{steps.length}
            </span>
            <h3 className="mt-2 text-base font-semibold">{step.title}</h3>
            <p className="mt-2 text-base text-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
