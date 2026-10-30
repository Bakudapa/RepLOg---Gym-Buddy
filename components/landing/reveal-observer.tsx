"use client";

import { useEffect } from "react";

/** Adds `is-visible` to `.reveal` sections as they enter the viewport (NFR7). */
export function RevealObserver() {
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(".reveal:not(.is-visible)");
    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return null;
}
