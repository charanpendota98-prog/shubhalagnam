"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";
import { whatsappPhoneLink } from "@/lib/wa";

export default function HomeSecondMarriageSection() {
  const { lang } = useLang();
  const te = lang === "te";
  const supportText = te
    ? "నమస్తే, పునర్వివాహ సేవల గురించి సమాచారం కావాలి."
    : "Hello, I would like information about the remarriage directory.";
  const supportUrl = whatsappPhoneLink(SITE_CONFIG.supportWhatsapp, supportText);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="relative space-y-6 overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-[#2D0A16] via-[#4A0C22] to-[#630E2E] p-6 text-white card-shadow-lg sm:p-8 md:p-10">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-4 border-b border-white/15 pb-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/20 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-200">
              <span aria-hidden="true">💍</span>
              <span>{te ? "పునర్వివాహ ప్రత్యేక విభాగం" : "SECOND MARRIAGE & REMARRIAGE"}</span>
            </div>
            <h2 className="text-xl font-black tracking-tight telugu sm:text-2xl md:text-3xl">
              {te ? (
                <>కొత్త జీవితానికి... <span className="text-amber-300">గౌరవప్రదమైన నాంది</span></>
              ) : (
                <>A new chapter, with <span className="text-amber-300">care and respect</span></>
              )}
            </h2>
            <p className="max-w-2xl text-xs font-medium leading-relaxed text-rose-100/90 sm:text-sm">
              {te
                ? "ఈ directory లోని వివరాలు సభ్యులు అందించినవి. వ్యక్తి వివరాలు, గుర్తింపు మరియు చట్టపరమైన స్థితిని స్వతంత్రంగా ధృవీకరించండి."
                : "Listings are member-submitted. Independently confirm a person’s details, identity and legal status before making decisions."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/second-marriage"
              className="inline-flex items-center gap-1.5 rounded-2xl gold-gradient px-5 py-2.5 text-xs font-black text-maroon shadow-md transition hover-lift sm:text-sm"
            >
              <span aria-hidden="true">💍</span>
              <span>{te ? "పునర్వివాహ సంబంధాలు చూడండి" : "Browse Remarriage Listings"}</span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href="/biodata?remarriage=true"
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/20 sm:text-sm"
            >
              🎴 {te ? "పునర్వివాహ బయోడేటా" : "Remarriage Biodata"}
            </Link>
          </div>
        </div>

        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <span className="text-xl" aria-hidden="true">🔒</span>
            <div>
              <h3 className="text-xs font-black text-amber-200">{te ? "గోప్యతా సెట్టింగులు" : "Privacy settings"}</h3>
              <p className="mt-1 text-[10.5px] leading-relaxed text-rose-100">{te ? "ఫోటో మరియు contact visibility సెట్టింగులపై ఆధారపడి ఉంటుంది." : "Photo and contact visibility depend on profile settings and consent."}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <span className="text-xl" aria-hidden="true">ℹ️</span>
            <div>
              <h3 className="text-xs font-black text-amber-200">{te ? "సభ్యుడు అందించిన వివరాలు" : "Member-submitted details"}</h3>
              <p className="mt-1 text-[10.5px] leading-relaxed text-rose-100">{te ? "Profile approval అనేది identity లేదా legal verification కాదు." : "Profile approval is not identity or legal verification."}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <span className="text-xl" aria-hidden="true">⚖️</span>
            <div>
              <h3 className="text-xs font-black text-amber-200">{te ? "స్వతంత్రంగా నిర్ధారించండి" : "Verify independently"}</h3>
              <p className="mt-1 text-[10.5px] leading-relaxed text-rose-100">{te ? "చట్టపరమైన పత్రాలు మరియు కుటుంబ వివరాలను స్వయంగా పరిశీలించండి." : "Review relevant legal documents and family details yourself."}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <span className="text-xl" aria-hidden="true">💬</span>
            <div>
              <h3 className="text-xs font-black text-amber-200">{te ? "సహాయ ఎంపికలు" : "Support options"}</h3>
              <p className="mt-1 text-[10.5px] leading-relaxed text-rose-100">{te ? "Support ప్రతిస్పందన సమయం మారవచ్చు." : "Support response times may vary."}</p>
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-center sm:flex-row sm:text-left">
          <p className="text-xs leading-relaxed text-rose-100">
            <span className="font-bold text-amber-200">{te ? "పునర్వివాహ సేవల గురించి ప్రశ్నలున్నాయా?" : "Questions about the remarriage service?"}</span>{" "}
            {te ? "Directory లోని ప్రొఫైళ్ల వివరాలను స్వతంత్రంగా పరిశీలించండి. WhatsApp support link ఉంటే అది configured contact ను మాత్రమే తెరుస్తుంది." : "Review listings independently. A WhatsApp support link is shown only when a contact has been configured; external availability is not monitored."}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {supportUrl ? (
              <a
                href={supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
              >
                💬 {te ? "WhatsApp support" : "WhatsApp support"}
              </a>
            ) : null}
            <Link href="/second-marriage" className="whitespace-nowrap rounded-xl border border-white/25 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10">
              {te ? "Directory తెరవండి" : "Open directory"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
