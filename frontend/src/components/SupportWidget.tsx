"use client";

import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";
import { WhatsAppIcon } from "@/components/BrandIcons";

/** Official, direct WhatsApp support — no bot/AI intermediary. */
export default function SupportWidget() {
  const pathname = usePathname() || "/";
  const { lang } = useLang();
  const te = lang === "te";
  const waNumber = SITE_CONFIG.supportWhatsapp || "916304996088";
  const message = te
    ? `నమస్తే మన వివాహ టీమ్, నాకు సహాయం కావాలి. నేను చూస్తున్న పేజీ: ${pathname}`
    : `Hello Mana Vivaha team, I need help. Page: ${pathname}`;
  const label = te ? "వాట్సాప్ సహాయం" : "WhatsApp Support";

  return (
    <aside className="fixed bottom-[4.5rem] right-3 z-50 sm:bottom-5 sm:right-5 no-print" aria-label={label}>
      <a
        href={`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label}: +91 63049 96088`}
        title={te ? "మన వివాహ టీమ్‌తో నేరుగా మాట్లాడండి" : "Chat directly with the Mana Vivaha team"}
        className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-[#128C4A] p-2 text-white shadow-[0_10px_30px_rgba(18,140,74,.28)] transition hover:-translate-y-0.5 hover:bg-[#0f7a40] hover:shadow-[0_14px_34px_rgba(18,140,74,.34)] active:translate-y-0 active:scale-[.98] focus-brand sm:h-auto sm:w-auto sm:justify-start sm:gap-2.5 sm:px-4 sm:py-2.5"
      >
        <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/14" aria-hidden="true">
          <WhatsAppIcon className="h-5 w-5" mono />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#128C4A] bg-emerald-200" />
        </span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-xs font-black">{label}</span>
          <span className="hidden text-[9px] font-medium text-white/80 sm:block">
            {te ? "నేరుగా మా టీమ్‌తో" : "Direct team support"}
          </span>
        </span>
      </a>
    </aside>
  );
}
