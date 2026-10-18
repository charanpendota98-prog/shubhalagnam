"use client";

/**
 * ⬆️ BackToTop — smooth scroll-to-top FAB (shows after 600px).
 * SupportWidget (bottom-right) tho clash avvakunda left side.
 */
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";

export default function BackToTop() {
  const { lang } = useLang();
  const te = lang === "te";
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 🛡️ R10 — register wizard lo footer buttons tho overlap + distraction vaddhu
  if (pathname?.startsWith("/register")) return null;
  if (!show) return null;
  return (
    <button type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label={te ? "పైకి వెళ్లు" : "Back to top"}
      title={te ? "పైకి వెళ్లు" : "Back to top"}
      className="no-print fixed bottom-20 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full maroon-gradient text-white text-lg shadow-xl transition hover:scale-105 sm:bottom-6"
    >
      ⬆️
    </button>
  );
}
