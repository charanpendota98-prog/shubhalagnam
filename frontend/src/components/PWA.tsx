"use client";

/**
 * PWA service-worker registration and optional install guidance.
 * Eligible browsers can show their native install prompt; iOS receives manual
 * Add to Home Screen steps. Other components may open the guidance via the
 * `tsap:install-show` event when an explicit install control is available.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";

// 🔐 Auth screens lo install bar vaddhu — form fields ni cover chestundi.
const AUTH_ROUTE_PREFIXES = ["/login", "/register", "/verify"];
const isAuthRoute = (p: string) =>
  AUTH_ROUTE_PREFIXES.some((x) => p === x || p.startsWith(x + "/"));

// "Later" is a cooldown, not a permanent no. The legacy boolean key
// (tsap_pwa_dismissed) hid the bar forever; it is migrated to a timestamp so
// the prompt can come back once, politely, after the cooldown.
const DISMISSED_AT_KEY = "tsap_pwa_dismissed_at";
const LEGACY_DISMISSED_KEY = "tsap_pwa_dismissed";
const COOLDOWN_DAYS = (() => {
  const n = Number(process.env.NEXT_PUBLIC_PWA_COOLDOWN_DAYS);
  return Number.isFinite(n) && n >= 1 && n <= 90 ? n : 14;
})();
export const PWA_COOLDOWN_MS = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;

/** True while the member's last "Later" is still inside the cooldown. Blocked
 *  or broken storage counts as in-cooldown: never nag when we cannot remember. */
export function pwaInCooldown(now = Date.now()): boolean {
  try {
    if (localStorage.getItem(LEGACY_DISMISSED_KEY)) {
      // Migrate once: the old dismissal starts a fresh cooldown today.
      if (!localStorage.getItem(DISMISSED_AT_KEY)) localStorage.setItem(DISMISSED_AT_KEY, new Date(now).toISOString());
      localStorage.removeItem(LEGACY_DISMISSED_KEY);
    }
    const raw = localStorage.getItem(DISMISSED_AT_KEY);
    if (!raw) return false;
    const at = Date.parse(raw);
    if (!Number.isFinite(at)) return false;          // corrupt value: treat as never dismissed
    if (at > now) return true;                        // clock moved back: stay quiet rather than nag
    return now - at < PWA_COOLDOWN_MS;
  } catch {
    return true;
  }
}

function rememberDismissal(): void {
  try { localStorage.setItem(DISMISSED_AT_KEY, new Date().toISOString()); } catch { /* storage blocked */ }
}

export default function PWA() {
  const { lang } = useLang();
  const te = lang === "te";
  const pathname = usePathname() || "";
  const pathRef = useRef(pathname);
  const [show, setShow] = useState(false);
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  // Auth screen ki navigate ayite visible bar ni kuda hide cheyi.
  useEffect(() => {
    if (isAuthRoute(pathname) || (["/matches", "/me", "/requests"].includes(pathname) || pathname.startsWith("/search/"))) setShow(false);
  }, [pathname]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const ua = navigator.userAgent || "";
    setIsIOS(/iphone|ipad|ipod/i.test(ua));
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (standalone) setInstalled(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e);
      // Auto-show only away from auth screens: the bar overlaps the
      // phone/password fields on mobile login (manual install events
      // from explicit controls still work elsewhere).
      setTimeout(() => {
        if (!pwaInCooldown() && !isAuthRoute(pathRef.current) && !(["/matches", "/me", "/requests"].includes(pathRef.current) || pathRef.current.startsWith("/search/"))) {
          setShow(true);
        }
      }, 6000);
    };
    const onManual = () => setShow(true);
    const onInstalled = () => { setInstalled(true); setShow(false); };
    // Another tab dismissed the bar: hide it here too.
    const onStorage = (e: StorageEvent) => { if (e.key === DISMISSED_AT_KEY && e.newValue) setShow(false); };
    window.addEventListener("storage", onStorage);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("tsap:install-show", onManual);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("tsap:install-show", onManual);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const install = async () => {
    try {
      if (promptEvent) {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === "dismissed") rememberDismissal();   // declined the native sheet: same cooldown
        else { try { localStorage.removeItem(DISMISSED_AT_KEY); } catch { /* storage blocked */ } }
      }
      setShow(false);
    } catch { setShow(false); }
  };

  const close = () => {
    setShow(false);
    rememberDismissal();
  };

  // 🛡️ R10 — StickyCTA tho bottom overlap vaddhu: ee bar visible ayite CTA bar hide
  useEffect(() => {
    window.dispatchEvent(new Event(show ? "tsap:pwa-bar-on" : "tsap:pwa-bar-off"));
  }, [show]);

  if (installed) return null;
  if (!show) return null;
  const iosMode = isIOS && !promptEvent;

  return (
    <div data-testid="pwa-install-bar" className="fixed bottom-36 left-3 right-3 md:bottom-4 md:left-auto md:right-4 md:w-[360px] z-40 no-print">
      <div className="bg-white rounded-2xl border border-gold/40 shadow-brand p-3 flex items-center gap-3 step-slide">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt={te ? "మన వివాహ" : "Mana Vivaha"} className="w-11 h-11 rounded-xl border border-gold/30" />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-maroon">
            {te ? "మన వివాహను హోమ్ స్క్రీన్‌కు జోడించండి" : "Add Mana Vivaha to your home screen"}
          </div>
          {iosMode ? (
            <div className="text-[11px] text-gray-600 telugu">
              {te
                ? 'iPhoneలో Share నొక్కి, "Add to Home Screen" ఎంచుకోండి. హోమ్ స్క్రీన్‌పై గుర్తు కనిపిస్తుంది.'
                : 'On iPhone, tap Share, then "Add to Home Screen". A shortcut appears on your home screen.'}
            </div>
          ) : (
            <div className="text-[11px] text-gray-600 telugu">
              {te
                ? "హోమ్ స్క్రీన్‌పై షార్ట్‌కట్‌ను జోడించండి. తాజా సంబంధాలు, అభ్యర్థనల కోసం ఇంటర్నెట్ అవసరం."
                : "Add a home screen shortcut. Live matches and requests need internet."}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {!iosMode && (
            <button type="button" onClick={install} className="px-3 py-2 rounded-xl maroon-gradient text-white text-[11px] font-bold">{te ? "జోడించండి" : "Install"}</button>
          )}
          <button type="button" onClick={close} className="px-3 py-1 text-[10px] text-gray-500">{te ? "తర్వాత" : "Later"}</button>
        </div>
      </div>
    </div>
  );
}
