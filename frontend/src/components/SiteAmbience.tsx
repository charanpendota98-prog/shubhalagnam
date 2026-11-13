"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * SITE-WIDE AMBIENCE — the "film grain" every route shares.
 *
 * Three jobs, one component, zero per-frame JS in the steady state:
 *  1. **Light stage.** Two very slow aurora veils + a warm beam that drift on
 *     their own CSS animations. They live on a `position: fixed` layer behind
 *     the document, so scrolling never repaints them.
 *  2. **Depth motes.** A handful of light specks for the routes that do not
 *     carry the full hero. Capped at 6 on phones — this is texture, not a
 *     particle system.
 *  3. **Scroll progress.** A 2px gold→maroon rule along the top edge, driven by
 *     a rAF-throttled passive scroll listener that only writes a CSS custom
 *     property (`transform: scaleX()`), so it stays on the compositor.
 *
 * Guardrails:
 *  • entirely decorative → `aria-hidden`, `pointer-events: none`, z-index below
 *    the header/overlays so it can never sit on top of a control;
 *  • the private consoles (/admin, /control, /owner, /growth) get none of it —
 *    an operator dashboard should look like a tool, not a film;
 *  • `prefers-reduced-motion: reduce` → everything static or absent;
 *  • nothing here runs until the browser is idle, and the pathname change
 *    re-mounts the stage so each route opens with a fresh, quiet entrance.
 */
const PLAIN_ROUTES = ["/admin", "/control", "/owner", "/growth", "/bureau"];

export default function SiteAmbience() {
  const pathname = usePathname() || "/";
  const barRef = useRef<HTMLSpanElement | null>(null);
  const [ready, setReady] = useState(false);

  const key = `/${(pathname.split("/").filter(Boolean)[0] || "")}`;
  const enabled = !PLAIN_ROUTES.includes(key);

  // Defer mounting until the main thread is quiet: the ambience must never
  // compete with the first content paint.
  useEffect(() => {
    if (!enabled) return;
    const start = () => setReady(true);
    const idle = window.requestIdleCallback;
    if (typeof idle === "function") {
      const handle = idle(start, { timeout: 1200 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(start, 350);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!ready) return;
    const bar = barRef.current;
    if (!bar) return;

    let frame = 0;
    const paint = () => {
      frame = 0;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      bar.style.setProperty("--scroll-progress", String(ratio));
      bar.dataset.active = ratio > 0.002 ? "true" : "false";
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [ready]);

  if (!enabled) return null;

  return (
    <div className="mv-ambience" aria-hidden="true" data-ready={ready ? "true" : "false"}>
      <span className="mv-ambience__beam" />
      <span className="mv-ambience__veil mv-ambience__veil--a" />
      <span className="mv-ambience__veil mv-ambience__veil--b" />
      <span className="mv-ambience__motes">
        {Array.from({ length: 6 }).map((_, index) => (
          <i key={index} />
        ))}
      </span>
      <span ref={barRef} className="mv-ambience__progress" data-active="false" />
    </div>
  );
}
