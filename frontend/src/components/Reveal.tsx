"use client";

import { useEffect, useRef, useState, type CSSProperties, type Ref } from "react";

type RevealVariant = "up" | "fade" | "left" | "right" | "zoom";

type Props = {
  children: React.ReactNode;
  /** ms — added to the element's own transition-delay. Prefer `group` for lists. */
  delay?: number;
  /** Index inside a staggered group; multiplied by `--ds-stagger-step`. */
  index?: number;
  /** Direction the element travels from. */
  variant?: RevealVariant;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "span";
};

/**
 * The one scroll-reveal primitive for the whole site.
 *
 * Guarantees, in order of importance:
 *  1. **Never a blank screen.** `visible` starts `true`, so server markup and
 *     the pre-hydration paint are fully opaque. The hidden state only exists
 *     once `.mv-js` is on `<html>`, which this component sets *after* the
 *     observer is running.
 *  2. **Cheap.** A single shared IntersectionObserver per threshold, only
 *     opacity/transform, `rootMargin` biased downward so things are already
 *     mid-transition when they enter the viewport, and each element is
 *     unobserved the moment it reveals (no scroll-time work afterwards).
 *  3. **Honest with reduced motion.** With `prefers-reduced-motion: reduce` it
 *     never hides anything and skips the observer entirely.
 *  4. **A11y-neutral.** It renders a plain element — no landmark, no ARIA, no
 *     focus change — so wrapping content cannot alter the accessibility tree.
 */
export default function Reveal({
  children,
  delay = 0,
  index,
  variant = "up",
  className = "",
  as = "div",
}: Props) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canObserve = "IntersectionObserver" in window;

    if (reduced || !canObserve) {
      setVisible(true);
      return;
    }

    // Only hide content once we know we can reveal it again.
    document.documentElement.classList.add("mv-js");

    // Already on screen at mount (above the fold / restored scroll): stay
    // visible, no flash of a section that animates in from nowhere.
    const box = node.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.92 && box.bottom > 0) {
      setVisible(true);
      return;
    }

    // Reveal as soon as any sliver enters the viewport — big sections are
    // almost never 8% visible in one go, and a section that stays invisible is
    // far worse than a section that animates a moment early.
    setVisible(false);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as "div";
  // Cap the stagger: index 30 in a long list would otherwise wait 2s. After the
  // eighth item the group reveals together, which reads as one wave instead of
  // a queue.
  const stagger = index != null ? `calc(${Math.min(index, 8)} * var(--ds-stagger-step) + ${delay}ms)` : delay ? `${delay}ms` : undefined;

  return (
    <Tag
      ref={ref as Ref<HTMLDivElement>}
      className={`reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
      data-reveal={variant}
      style={stagger ? ({ "--reveal-delay": stagger } as CSSProperties) : undefined}
    >
      {children}
    </Tag>
  );
}
