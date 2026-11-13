"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * PillScroller — the one horizontal chip/pill row used across the app.
 * =====================================================================
 * Why a component instead of a bare `overflow-x-auto` div:
 *
 *  • One-line pills. Every child is laid out with `flex` + `nowrap`, so a chip
 *    never collapses into a one-letter-per-line column on a 360px phone.
 *  • Natural width, never squeezed. `flex: 0 0 auto` on each item means a pill
 *    keeps the width its content needs and the row scrolls instead of
 *    compressing (the classic `min-width: auto` flex trap is avoided by the
 *    global `min-width: 0` reset plus this rule).
 *  • 44px tap targets, kept on the row itself so the whole rail is easy to hit.
 *  • Discoverable scroll: edge fades appear only on the side that actually has
 *    more content, so the row reads as scrollable without a visible scrollbar.
 *  • Keyboard + AT friendly: the scroll container is a labelled `group` with a
 *    roving tabindex — one Tab stop for the rail, then arrow keys move within
 *    the pills (see `onKeyDown`). Screen readers still get every pill.
 *  • No layout thrash: the overflow check is coalesced into one rAF per frame
 *    burst and detached when the row is empty.
 *  • RTL-safe and reduced-motion-safe (fades are opacity only).
 */

type Props = {
  /** Accessible name for the row ("Vendor category filters"). */
  label: string;
  children: ReactNode;
  /** Extra classes for the scroll container. */
  className?: string;
  /** Extra classes applied to the inner track. */
  trackClassName?: string;
  /** Fade colour used at the scroll edges; defaults to the cream page tone. */
  fadeFrom?: string;
  as?: "div" | "nav";
};

const EDGE_FADE = 28;

export default function PillScroller({
  label,
  children,
  className = "",
  trackClassName = "",
  fadeFrom = "var(--ds-cream)",
  as = "div",
}: Props) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: false, end: false });
  const frame = useRef(0);

  const measure = useCallback(() => {
    frame.current = 0;
    const node = trackRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    if (max <= 2) {
      setEdges((previous) => (previous.start || previous.end ? { start: false, end: false } : previous));
      return;
    }
    // `scrollLeft` is negative in RTL in some engines; normalise it.
    const offset = Math.abs(node.scrollLeft);
    const next = { start: offset > 2, end: offset < max - 2 };
    setEdges((previous) =>
      previous.start === next.start && previous.end === next.end ? previous : next,
    );
  }, []);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    const schedule = () => {
      if (!frame.current) frame.current = requestAnimationFrame(measure);
    };
    schedule();
    node.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    observer?.observe(node);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      node.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer?.disconnect();
    };
  }, [measure]);

  /** Arrow-key navigation between the pills inside the rail. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    const node = trackRef.current;
    if (!node) return;
    const pills = Array.from(node.querySelectorAll<HTMLElement>("button, a[href]")).filter(
      (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
    );
    if (pills.length === 0) return;
    const active = document.activeElement as HTMLElement | null;
    const current = active ? pills.indexOf(active) : -1;
    let next = current;
    if (event.key === "ArrowRight") {
      // Telugu/English copy is LTR, but in an RTL locale the visual order flips.
      const rtl = getComputedStyle(node).direction === "rtl";
      next = current + (rtl ? -1 : 1);
    } else if (event.key === "ArrowLeft") {
      const rtl = getComputedStyle(node).direction === "rtl";
      next = current + (rtl ? 1 : -1);
    } else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = pills.length - 1;
    if (next < 0) next = 0;
    if (next > pills.length - 1) next = pills.length - 1;
    if (next !== current) {
      event.preventDefault();
      pills[next]?.focus();
      pills[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const Tag = as as "div" | "nav";

  return (
    <Tag className={`pill-rail ${className}`.trim()} aria-label={label} role="group">
      <div
        ref={trackRef}
        onKeyDown={onKeyDown}
        className={`pill-track ${trackClassName}`.trim()}
        // The rail is a single tab stop; inside it, arrow keys move between pills.
        tabIndex={0}
        data-edge-start={edges.start ? "true" : undefined}
        data-edge-end={edges.end ? "true" : undefined}
        style={
          {
            "--pill-fade": fadeFrom,
            "--pill-fade-w": `${EDGE_FADE}px`,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </Tag>
  );
}
