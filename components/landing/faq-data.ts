export type FaqItem = { question: string; answer: string };

export const faqItems: FaqItem[] = [
  {
    question: "Why is it free?",
    answer:
      "RepLog is a portfolio project by one developer. It costs very little to run, so there is no paid tier and no ads.",
  },
  {
    question: "What do you do with my email?",
    answer:
      "It is your login: we use it to confirm your account and to send password reset links. No newsletters, and we never share or sell it.",
  },
  {
    question: "When does it launch?",
    answer:
      "It's live. Create an account and log your next workout, or try the demo first.",
  },
  {
    question: "Does it work offline?",
    answer:
      "No. RepLog saves each set to your account as you log it, so it needs an internet connection.",
  },
  {
    question: "Can I try it without signing up?",
    answer:
      "Yes. Try the demo opens a read-only account with six weeks of sample training, so you can see the history, charts, and records.",
  },
  {
    question: "Can I suggest a feature?",
    answer:
      "Please do. Open Feedback from the menu or the section below and tell us what you'd like to see. Critique and bug reports are welcome too.",
  },
  {
    question: "Does it use kilograms or pounds?",
    answer: "Kilograms only, for both the app and the 1RM calculator on this page.",
  },
  {
    question: "Can I delete my data?",
    answer:
      "Yes. Settings → Delete account removes your account and every workout and set, right away.",
  },
];
