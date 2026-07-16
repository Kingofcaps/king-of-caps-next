"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

export default function ProductReveal({ children, index }: { children: ReactNode; index: number }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [revealState, setRevealState] = useState<"idle" | "waiting" | "visible">("idle");

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      return;
    }

    let observer: IntersectionObserver | null = null;
    let fallbackTimeout: number | null = null;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;

    const reveal = () => {
      setRevealState("visible");
      observer?.disconnect();
      if (fallbackTimeout !== null) window.clearTimeout(fallbackTimeout);
      window.removeEventListener("scroll", checkViewportFallback);
      window.removeEventListener("resize", checkViewportFallback);
    };

    const checkViewportFallback = () => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top <= window.innerHeight * 0.95 && bounds.bottom >= 0) reveal();
    };

    try {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          reveal();
        },
        { rootMargin: "0px 0px -5% 0px", threshold: 0.08 },
      );

      firstFrame = window.requestAnimationFrame(() => {
        setRevealState("waiting");
        window.addEventListener("scroll", checkViewportFallback, { passive: true });
        window.addEventListener("resize", checkViewportFallback);
        fallbackTimeout = window.setTimeout(checkViewportFallback, 1500);

        secondFrame = window.requestAnimationFrame(() => {
          try {
            observer?.observe(element);
            checkViewportFallback();
          } catch {
            reveal();
          }
        });
      });
    } catch {
      observer?.disconnect();
    }

    return () => {
      observer?.disconnect();
      if (fallbackTimeout !== null) window.clearTimeout(fallbackTimeout);
      if (firstFrame !== null) window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
      window.removeEventListener("scroll", checkViewportFallback);
      window.removeEventListener("resize", checkViewportFallback);
    };
  }, []);

  const delay = (index % 4) * 60;
  const isWaiting = revealState === "waiting";
  const isInitialized = revealState !== "idle";

  return (
    <div
      ref={elementRef}
      style={{ transitionDelay: revealState === "visible" ? `${delay}ms` : "0ms" }}
      className={`h-full motion-reduce:translate-y-0 motion-reduce:opacity-100 motion-reduce:transition-none ${isInitialized ? "transition-[opacity,transform] duration-[600ms] ease-out" : ""} ${isWaiting ? "translate-y-5 opacity-0" : "translate-y-0 opacity-100"}`}
    >
      {children}
    </div>
  );
}
