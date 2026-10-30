"use client";

import { useEffect, useRef, useState } from "react";

const DURATION_MS = 250;
const numberFormat = new Intl.NumberFormat("en-US");

/**
 * "X sets logged" with a short count-up the first time it is seen (NFR7). The
 * number is real: every set logged by non-demo users (FR11).
 */
export function SetsCounter({ count }: { count: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [display, setDisplay] = useState(count);

  useEffect(() => {
    const element = ref.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !element || !("IntersectionObserver" in window)) return;

    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION_MS);
        setDisplay(Math.round(count * (1 - (1 - progress) ** 3)));
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

  return (
    <p ref={ref} className="text-sm text-muted">
      <span aria-hidden="true">
        <span className="num text-base font-medium text-fg">
          {numberFormat.format(display)}
        </span>{" "}
        sets logged by lifters so far
      </span>
      <span className="sr-only">
        {numberFormat.format(count)} sets logged by lifters so far
      </span>
    </p>
  );
}
