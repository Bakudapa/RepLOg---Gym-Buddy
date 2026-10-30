import { Section, SectionHeader } from "@/components/ui/section";

// Only features that exist in the app (FR3, PRD-app).
const features = [
  {
    title: "Quick set logging",
    description:
      "Pick an exercise, and the weight and reps from last time are filled in. Repeat a set with one tap.",
  },
  {
    title: "Progress charts",
    description:
      "See your best estimated 1RM per session for every lift, over 4 weeks, 12 weeks, or all time.",
  },
  {
    title: "Automatic personal records",
    description:
      "When a set beats your heaviest weight or best estimated 1RM, RepLog marks it as a PR. No formulas.",
  },
  {
    title: "Rest timer",
    description:
      "Starts when you add a set. Choose 60 to 180 seconds, add or remove 15, and feel a buzz when it's time.",
  },
  {
    title: "Workout history",
    description:
      "Every session with its duration, sets, and volume. Open one to fix a typo or delete a set.",
  },
  {
    title: "Free",
    description: "No paid tier, no ads, no trial. Everything on this page is included.",
  },
];

export function Features() {
  return (
    <Section id="features" labelledBy="features-title">
      <SectionHeader
        id="features-title"
        label="Features"
        title="What RepLog does"
        description="Six things a training log should do well. Every one of them works today, for free."
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
