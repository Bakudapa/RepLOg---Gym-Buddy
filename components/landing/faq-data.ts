export type FaqItem = { question: string; answer: string };

export const faqItems: FaqItem[] = [
  {
    question: "Why is it free?",
    answer:
      "A training log doesn't need a subscription. RepLog keeps your data on your device first, so it costs very little to run. There is no paid tier and no ads.",
  },
  {
    question: "What do you do with my email?",
    answer:
      "We use it for one thing: telling you when RepLog launches. No newsletters, and we never share or sell it. Send us a note through Feedback if you want it removed.",
  },
  {
    question: "When does it launch?",
    answer:
      "There is no fixed date yet. Everyone on the waitlist hears about it first, the day it is ready.",
  },
  {
    question: "Does it work offline?",
    answer:
      "Yes. Logging, the rest timer, and your history all work without a connection. Changes sync once you are back online.",
  },
  {
    question: "Can I suggest a feature?",
    answer:
      "Please do. Open Feedback from the menu or the section below and tell us what you'd like to see. Critique and bug reports are welcome too.",
  },
  {
    question: "Does it use kilograms or pounds?",
    answer:
      "Kilograms at launch, which is also what the 1RM calculator on this page uses. Pounds are planned.",
  },
];
