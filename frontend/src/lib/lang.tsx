"use client";
/** Global Telugu ⇄ English preference shared by every client page. */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "te" | "en";
const STORE_KEY = "tsap_lang";
const EVENT_NAME = "manavivaha:language";

let currentLang: Lang = "te";
export function getLang(): Lang { return currentLang; }

function validLang(value: unknown): value is Lang {
  return value === "te" || value === "en";
}

function applyDocumentLanguage(lang: Lang) {
  currentLang = lang;
  const root = document.documentElement;
  root.lang = lang === "te" ? "te-IN" : "en-IN";
  root.dir = "ltr";
  root.dataset.lang = lang;
}

type Ctx = { lang: Lang; setLang: (lang: Lang) => void; t: (te: string, en: string) => string };
const LangCtx = createContext<Ctx | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("te");

  const update = useCallback((next: Lang, persist: boolean) => {
    applyDocumentLanguage(next);
    setLangState(next);
    if (persist) {
      try { localStorage.setItem(STORE_KEY, next); } catch { /* storage may be disabled */ }
    }
  }, []);

  useEffect(() => {
    let initial: Lang = "te";
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (validLang(saved)) initial = saved;
    } catch { /* use Telugu default */ }
    update(initial, false);

    // Keep multiple open tabs/windows in the same selected language.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORE_KEY && validLang(event.newValue)) update(event.newValue, false);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [update]);

  const setLang = useCallback((next: Lang) => {
    update(next, true);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { lang: next } }));
  }, [update]);

  const value = useMemo<Ctx>(() => ({
    lang,
    setLang,
    t: (te, en) => (lang === "te" ? te : en),
  }), [lang, setLang]);

  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const value = useContext(LangCtx);
  if (!value) throw new Error("useLang must be used inside LangProvider");
  return value;
}

export function T({ te, en, className = "" }: { te: string; en: string; className?: string }) {
  const { lang } = useLang();
  return <span className={className} lang={lang === "te" ? "te-IN" : "en-IN"}>{lang === "te" ? te : en}</span>;
}

export function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`lang-toggle ${compact ? "lang-toggle--compact" : ""}`}
      role="group"
      aria-label={lang === "te" ? "భాషను ఎంచుకోండి" : "Choose language"}
    >
      {(["te", "en"] as Lang[]).map((option) => {
        const selected = lang === option;
        const label = option === "te" ? "తెలుగు" : "English";
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLang(option)}
            aria-pressed={selected}
            aria-label={option === "te" ? "తెలుగులో చూపించండి" : "Show in English"}
            lang={option === "te" ? "te-IN" : "en-IN"}
            className={selected ? "is-selected" : ""}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
