import { Section, SectionHeader } from "@/components/ui/section";

const features = [
  {
    title: "Quick set logging",
    description:
      "Enter weight and reps in two taps. Last session's numbers are filled in, so you only change what moved.",
  },
  {
    title: "Progress charts",
    description:
      "See estimated 1RM and volume for each lift across weeks and months, drawn from the sets you logged.",
  },
  {
    title: "Rest timer",
    description:
      "The timer starts when you finish a set. Pick a default per exercise and get a quiet nudge when it's time.",
  },
  {
    title: "Program templates",
    description:
      "Start from Push/Pull/Legs, Upper/Lower, or Full Body, then swap exercises to fit your training.",
  },
  {
    title: "Automatic personal records",
    description:
      "When you lift more weight or more reps than before, RepLog marks the set as a PR. No spreadsheet formulas.",
  },
  {
    title: "Works offline",
    description:
      "No signal in the basement gym? Logging works without a connection and syncs when you're back online.",
  },
];

export function Features() {
  return (
    <Section id="features" labelledBy="features-title">
      <SectionHeader
        id="features-title"
        label="Features"
        title="What RepLog does"
        description="Six things a training log should do well. Every one of them is free."
      />
      <ul className="mt-12 grid gap-x-10 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <li key={feature.title} className="border-t border-line py-6">
            <span className="num text-xs text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-2 text-base font-semibold">{feature.title}</h3>
            <p className="mt-2 text-base text-muted">{feature.description}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
