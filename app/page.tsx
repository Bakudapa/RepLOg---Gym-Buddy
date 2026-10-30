import { CalculatorSection } from "@/components/calculator/calculator-section";
import { OneRepMaxCalculator } from "@/components/calculator/one-rep-max-calculator";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { FeedbackProvider } from "@/components/feedback/feedback-context";
import { Suspense } from "react";
import { AccountDeletedNotice } from "@/components/landing/account-deleted-notice";
import { Comparison } from "@/components/landing/comparison";
import { Faq } from "@/components/landing/faq";
import { FeedbackCta } from "@/components/landing/feedback-cta";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Navbar } from "@/components/landing/navbar";
import { RevealObserver } from "@/components/landing/reveal-observer";
import { WaitlistCountProvider } from "@/components/landing/waitlist-context";
import { WaitlistCounter } from "@/components/landing/waitlist-counter";
import { WaitlistForm } from "@/components/landing/waitlist-form";
import { WaitlistSection } from "@/components/landing/waitlist-section";
import { getWaitlistCount } from "@/lib/waitlist-count";

// Counter is refreshed at most once a minute (FR11).
export const revalidate = 60;

export default async function Home() {
  const count = await getWaitlistCount();

  return (
    <WaitlistCountProvider initialCount={count}>
      <FeedbackProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-fg focus:px-4 focus:py-3 focus:text-bg"
        >
          Skip to content
        </a>
        <Navbar />
        {/* Reads the query string on the client, so the page itself stays static. */}
        <Suspense fallback={null}>
          <AccountDeletedNotice />
        </Suspense>
        <main id="main">
          <Hero counter={<WaitlistCounter />} />
          <Features />
          <HowItWorks />
          <CalculatorSection>
            <OneRepMaxCalculator />
          </CalculatorSection>
          <Comparison />
          <Faq />
          <WaitlistSection>
            <WaitlistForm />
          </WaitlistSection>
          <FeedbackCta action={<FeedbackButton />} />
        </main>
        <Footer />
        <RevealObserver />
      </FeedbackProvider>
    </WaitlistCountProvider>
  );
}
