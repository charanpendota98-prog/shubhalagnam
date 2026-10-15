"use client";

import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { whatsappPhoneLink } from "@/lib/wa";

/** Persistent link to support contact options. */
export default function SupportWidget() {
  const pathname = usePathname() || "/";
  const { lang } = useLang();
  const te = lang === "te";
  const waNumber = SITE_CONFIG.supportWhatsapp;
  const message = te
    ? `నమస్తే మన వివాహ టీమ్, నాకు సహాయం కావాలి. నేను చూస్తున్న పేజీ: ${pathname}`
    : `Hello Mana Vivaha team, I need help. Page: ${pathname}`;
  const whatsappUrl = waNumber ? whatsappPhoneLink(waNumber, message) : null;
  // A direct support button is shown only when an administrator has supplied
  // a WhatsApp destination. Never disguise a safety page as WhatsApp support.
  if (!whatsappUrl) return null;
  const label = te ? "WhatsApp సహాయం" : "WhatsApp Support";

  return (
    <aside className="fixed bottom-[4.5rem] right-3 z-50 sm:bottom-5 sm:right-5 no-print" aria-label={label}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label}; ${te ? "బాహ్య WhatsApp లింక్ తెరుస్తుంది" : "opens an external WhatsApp link"}`}
        title={te ? "WhatsApp తెరుస్తుంది; బాహ్య సేవ లభ్యతను ఈ సైట్ నిర్ధారించదు" : "Opens WhatsApp; this site does not verify external service availability"}
        className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/70 bg-gradient-to-r from-[#128C4A] via-[#20bd5a] to-[#0b7d46] px-3 py-2 text-white shadow-[0_10px_30px_rgba(18,140,74,.32)] transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_14px_34px_rgba(18,140,74,.42)] active:translate-y-0 active:scale-[.98] focus-brand sm:gap-2.5 sm:px-4"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15" aria-hidden="true">
          <WhatsAppIcon className="h-5 w-5" mono />
        </span>
        <span className="text-left leading-tight">
          <span className="block text-xs font-black">{label}</span>
          <span className="hidden text-[9px] font-medium text-white/85 sm:block">
            {te ? "సందేశం పంపడానికి WhatsApp తెరవండి" : "Open WhatsApp to start a message"}
          </span>
        </span>
      </a>
    </aside>
  );
}
