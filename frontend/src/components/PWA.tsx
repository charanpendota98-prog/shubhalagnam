"use client";

/**
 * PWA — service worker + "app laga install" (Android prompt + iPhone manual steps).
 * Hero "📲 App" button → window event 'tsap:install-show' → ee card open avutundi.
 * WAVE 39: iOS instructions + reinstall (dismiss ayina malli open cheyochu).
 */
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

export default function PWA() {
  const { lang } = useLang();
  const te = lang === "te";
  const [show, setShow] = useState(false);
  const [promptEvent, setPromptEvent] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);

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
      if (!localStorage.getItem("tsap_pwa_dismissed")) setTimeout(() => setShow(true), 6000);
    };
    const onManual = () => setShow(true);
    const onInstalled = () => { setInstalled(true); setShow(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("tsap:install-show", onManual);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("tsap:install-show", onManual);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    try {
      if (promptEvent) {
        await promptEvent.prompt();
        localStorage.removeItem("tsap_pwa_dismissed");
      }
      setShow(false);
    } catch { setShow(false); }
  };

  const close = () => {
    setShow(false);
    localStorage.setItem("tsap_pwa_dismissed", "1");
  };

  // 🛡️ R10 — StickyCTA tho bottom overlap vaddhu: ee bar visible ayite CTA bar hide
  useEffect(() => {
    window.dispatchEvent(new Event(show ? "tsap:pwa-bar-on" : "tsap:pwa-bar-off"));
  }, [show]);

  if (installed) return null;
  if (!show) return null;
  const iosMode = isIOS && !promptEvent;

  return (
    <div className="fixed bottom-36 left-3 right-3 md:bottom-4 md:left-auto md:right-4 md:w-[360px] z-40 no-print">
      <div className="bg-white rounded-2xl border border-gold/40 shadow-brand p-3 flex items-center gap-3 step-slide">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="మన వివాహ app" className="w-11 h-11 rounded-xl border border-gold/30" />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-maroon">
            {te ? "📲 మన వివాహ app లాగా install చేసుకోండి" : "📲 Install మన వివాహ as app"}
          </div>
          {iosMode ? (
            <div className="text-[11px] text-gray-600 telugu">
              {te
                ? "iPhone: Share ⬆️ → “Add to Home Screen” నొక్కండి — Home screen లో icon వస్తుంది."
                : "iPhone: tap Share ⬆️ → “Add to Home Screen” — icon comes on home screen."}
            </div>
          ) : (
            <div className="text-[11px] text-gray-600 telugu">
              {te
                ? "Home screen లో icon వస్తుంది — matches + requests వెంటనే చూడొచ్చు (offline లో కూడా open అవుతుంది)."
                : "Icon on home screen — matches + requests instantly (opens offline too)."}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {!iosMode && (
            <button onClick={install} className="px-3 py-2 rounded-xl maroon-gradient text-white text-[11px] font-bold">Install</button>
          )}
          <button onClick={close} className="px-3 py-1 text-[10px] text-gray-500">{te ? "తర్వాత" : "later"}</button>
        </div>
      </div>
    </div>
  );
}
