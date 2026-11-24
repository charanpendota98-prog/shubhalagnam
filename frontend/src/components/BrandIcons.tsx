"use client";

/**
 * Brand icons — Telegram (paper plane) + WhatsApp (phone bubble).
 * Professional SVGs, brand colors, inline (no external requests).
 */

export function TelegramIcon({ className = "w-4 h-4", mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={mono ? "currentColor" : "#229ED9"} className={className} aria-hidden="true">
      <path d="M23.91 3.79 20.3 20.84c-.25 1.21-.98 1.5-2 .94l-5.5-4.07-2.66 2.57c-.3.3-.55.56-1.1.56-.55 0-.72-.25-1.01-.83L5.53 14.6 1.02 13.19c-1.13-.35-1.14-1.13.24-1.68l19.3-7.45c.98-.36 1.85.24 1.53 1.73h-.18Z" />
    </svg>
  );
}

export function WhatsAppIcon({ className = "w-4 h-4", mono = false }: { className?: string; mono?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" fill={mono ? "currentColor" : "#25D366"} className={className} aria-hidden="true">
      <path d="M16.04 4c-6.63 0-12 5.36-12 11.97 0 2.11.55 4.17 1.61 5.99L4 28l6.2-1.62a12 12 0 0 0 5.84 1.5h.01c6.62 0 11.99-5.36 11.99-11.97 0-3.2-1.25-6.2-3.52-8.46A11.93 11.93 0 0 0 16.04 4Zm0 21.87h-.01a9.9 9.9 0 0 1-5.05-1.38l-.36-.22-3.71.97.99-3.62-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.5 4.47-9.97 9.98-9.97 2.66 0 5.16 1.04 7.04 2.92a9.82 9.82 0 0 1 2.92 7.05c0 5.5-4.48 9.97-10.05 9.97Zm5.46-7.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.11 3.22 5.1 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

/** Small labelled chip — "✈️ Telegram" / "🟢 WhatsApp" neat ga, icons tho */
export function TelegramButton({ href, label, className = "" }: { href?: string; label: string; className?: string }) {
  return (
    <LocaleAnchor href={href || "#"} target="_blank" rel="noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-xl bg-[#229ED9] text-white font-bold px-3.5 py-2.5 text-[12px] shadow-soft hover:brightness-110 active:scale-[0.97] transition ${className}`}>
      <TelegramIcon className="w-4 h-4" mono />
      {label}
    </LocaleAnchor>
  );
}

export function WhatsAppButton({ href, label, className = "" }: { href?: string; label: string; className?: string }) {
  return (
    <LocaleAnchor href={href || "#"} target="_blank" rel="noreferrer"
      className={`inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] text-white font-bold px-3.5 py-2.5 text-[12px] shadow-soft hover:brightness-110 active:scale-[0.97] transition ${className}`}>
      <WhatsAppIcon className="w-4 h-4" mono />
      {label}
    </LocaleAnchor>
  );
}

import LocaleAnchor from "@/components/LocaleAnchor";
