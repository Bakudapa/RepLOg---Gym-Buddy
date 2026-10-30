"use client";

import { useEffect, useRef, useState } from "react";
import { useWaitlistCount } from "./waitlist-context";

const DURATION_MS = 250;
const numberFormat = new Intl.NumberFormat("en-US");

/** "Join X lifters" with a short count-up the first time it is seen (NFR7). */
export function WaitlistCounter() {
  const { count } = useWaitlistCount();
  const ref = useRef<HTMLParagraphElement>(null);
  const [display, setDisplay] = useState(count ?? 0);
  const animated = useRef(false);

  useEffect(() => {
    if (count === null) return;
    const element = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animated.current || reduce || !element || !("IntersectionObserver" in window)) {
      setDisplay(count);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      animated.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - (1 - progress) ** 3;
        setDisplay(Math.round(count * eased));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [count]);

  if (count === null) return null;

  if (count === 0) {
    return <p className="text-sm text-muted">Be the first to join.</p>;
  }

  return (
    <p ref={ref} className="text-sm text-muted">
      <span aria-hidden="true">
        Join{" "}
        <span className="num text-base font-medium text-fg">
          {numberFormat.format(display)}
        </span>{" "}
        {count === 1 ? "lifter" : "lifters"} on the waitlist
      </span>
      <span className="sr-only">
        Join {numberFormat.format(count)} {count === 1 ? "lifter" : "lifters"} on the
        waitlist
      </span>
    </p>
  );
}
