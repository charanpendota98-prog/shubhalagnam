"use client";

/**
 * 📲 OFFICIAL WHATSAPP FLOATING BUTTON — మన వివాహ
 * Direct 1-Tap Connect to Official WhatsApp Support (+916304996088).
 * Clean, distraction-free, high-end floating button.
 */
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";

export default function SupportWidget() {
  const pathname = usePathname();
  const { lang } = useLang();
  const te = lang === "te";

  // Hide in register wizard to prevent overlapping bottom action buttons
  if (pathname?.startsWith("/register")) return null;

  const waNumber = SITE_CONFIG.supportWhatsapp || "916304996088";
  const defaultText = encodeURIComponent(
    te
      ? "నమస్తే మన వివాహ (Mana Vivaha) టీమ్, నాకు సహాయం కావాలి."
      : "Hello Mana Vivaha team, I need assistance."
  );

  return (
    <div className="fixed bottom-20 right-4 z-50 sm:bottom-6">
      <a
        href={`https://wa.me/${waNumber}?text=${defaultText}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={te ? "వాట్సాప్ సహాయం (+916304996088)" : "WhatsApp Support (+916304996088)"}
        title={te ? "WhatsApp లో మాట్లాడండి (+91 63049 96088)" : "Chat on WhatsApp (+91 63049 96088)"}
        className="group flex h-13 items-center gap-2.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] px-4 text-white shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 focus-brand border-2 border-white/50"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-100"></span>
        </span>
        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.699c.971.53 1.905.815 2.796.815 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.586-5.767-5.768-5.767zm0 10.373c-.886 0-1.745-.251-2.485-.728l-.178-.115-1.579.414.421-1.539-.12-.191c-.516-.821-.789-1.776-.788-2.75 0-2.617 2.13-4.746 4.75-4.746 2.618 0 4.748 2.13 4.748 4.748 0 2.617-2.13 4.747-4.748 4.747zm7.969-4.607c-.04-4.417-3.635-8.01-8.052-8.01-4.437 0-8.046 3.609-8.046 8.046 0 1.417.371 2.799 1.076 4.02l-1.144 4.181 4.277-1.121c1.176.642 2.506.98 3.869.98 4.437 0 8.046-3.609 8.046-8.046 0-.017 0-.033-.001-.05z"/>
        </svg>
        <span className="text-xs font-black tracking-wide sm:inline">
          {te ? "WhatsApp సహాయం" : "WhatsApp Chat"}
        </span>
      </a>
    </div>
  );
}
