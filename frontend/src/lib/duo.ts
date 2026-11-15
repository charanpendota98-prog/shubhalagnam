"use client";
/**
 * 🌐 WAVE 30 — DUO is now TOGGLE-aware (was: "English • తెలుగు" mixed everywhere).
 * ONE language at a time per user demand (neat + professional, no "galiz" mix).
 * Default Telugu; header toggle switches to English. SSR default = Telugu.
 */
import React from "react";
import { getLang, useLang } from "./lang";

/** Plain-string version — follows the toggle (call during render). */
export function duo(en: string, te: string): string {
  try {
    return getLang() === "te" ? te : en;
  } catch {
    return te;
  }
}

/** JSX version — re-renders on toggle. */
export function Duo({ en, te, className = "" }: { en: string; te: string; className?: string }) {
  const { lang } = useLang();
  return React.createElement("span", { className: className || undefined }, lang === "te" ? te : en);
}

/** Render-time strings must use the same context snapshot as their component.
 * A module-global language may change while a streamed boundary hydrates. */
export function useDuo(): (en: string, te: string) => string {
  const { lang } = useLang();
  return (en, te) => lang === "te" ? te : en;
}
