"use client";

/**
 * 🏠🌊 WAVE 18 — Homepage growth: blurred teaser profiles + success stories + religions.
 * Open cheyagane register/login ki push — photos blur, details lock, CTA maroon.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Duo, duo } from "@/lib/duo";
import { apiGet } from "@/lib/api";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";

type Teaser = {
  tsap_id?: string; full_name?: string; age?: number | string; gender?: string;
  caste?: string; education?: string; job?: string; district?: string; state?: string;
};
type Story = {
  story_id?: string; couple_names?: string; text?: string; photo_url?: string;
  district?: string; likes?: number;
};

function firstName(n?: string) {
  return String(n || "").split(" ")[0] || "Member";
}

export function TeaserStrip() {
  const [rows, setRows] = useState<Teaser[]>([]);
  useEffect(() => {
    void apiGet<{ teasers?: Teaser[] }>("/api/home/teasers?limit=8")
      .then(({ ok, data }) => { if (ok && data?.teasers) setRows(data.teasers); });
  }, []);
  if (!rows.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <Reveal>
        <SectionHeading
          eyebrow={duo("New profiles", "కొత్త ప్రొఫైళ్లు")}
          title={duo("Real people. Real families. Waiting for you.", "నిజమైన వ్యక్తులు. నిజమైన కుటుంబాలు. మీకోసం ఎదురుచూస్తున్నారు.")}
          subtitle={duo("🔒 Photos blur + details lock — REGISTER (FREE) to open full profiles.", "🔒 Photos blur + details lock — REGISTER (FREE) చేస్తే full profiles open అవుతాయి.")}
          telugu
        />
      </Reveal>
      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        {rows.map((t, i) => (
          <Reveal key={String(t.tsap_id || i)} delay={i * 60}>
            <div className="relative bg-white rounded-2xl overflow-hidden border border-gold/25 card-shadow">
              <div className="relative h-40 bg-gradient-to-br from-maroon via-[#5c0822] to-gold-deep flex items-center justify-center overflow-hidden">
                {/* soft decorative pattern so a locked card never looks like an empty gap */}
                <span aria-hidden className="pointer-events-none absolute inset-0 opacity-25"
                  style={{ backgroundImage: "radial-gradient(circle at 20% 25%, rgba(255,255,255,.35) 0, transparent 42%), radial-gradient(circle at 82% 75%, rgba(212,175,55,.5) 0, transparent 45%)" }} />
                <span className="text-6xl blur-[7px] select-none opacity-80" aria-hidden>{t.gender === "Groom" ? "🤵" : "👰"}</span>
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <span className="text-2xl">🔒</span>
                  <span className="bg-black/45 text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm">{t.gender === "Groom" ? (t.district || "Groom") : (t.district || "Bride")}</span>
                </span>
              </div>
              <div className="p-3">
                <div className="font-bold text-[14px] text-ink">{firstName(t.full_name)} • {t.age}y</div>
                <div className="text-[11px] text-gray-600">{t.caste} · {t.education} · {t.district}</div>
                <div className="text-[11px] text-gray-500">{t.job}</div>
                <Link href="/register"
                  className="mt-2 block text-center rounded-xl maroon-gradient text-white text-[12px] font-bold py-2">
                  <Duo en="View full profile" te="పూర్తి ప్రొఫైల్ చూడండి" />
                </Link>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function StoriesStrip() {
  const [rows, setRows] = useState<Story[]>([]);
  useEffect(() => {
    void apiGet<{ stories?: Story[] }>("/api/stories?limit=3")
      .then(({ ok, data }) => { if (ok && data?.stories) setRows(data.stories); });
  }, []);
  if (!rows.length) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <Reveal>
        <SectionHeading
          eyebrow={duo("Success stories", "విజయ గాథలు")}
          title={duo("They met here. Married here. 💑", "వీరు ఇక్కడే కలిశారు. ఇక్కడే పెళ్లి చేసుకున్నారు. 💑")}
          subtitle={duo("Your story could be next — register FREE, in 3 minutes.", "మీ story కూడా next — register FREE, 3 నిమిషాల్లో.")}
          telugu
        />
      </Reveal>
      <div className="mt-5 grid md:grid-cols-3 gap-4">
        {rows.map((s, i) => (
          <Reveal key={String(s.story_id || i)} delay={i * 80}>
            <div className="bg-white rounded-2xl p-5 border border-gold/25 card-shadow h-full">
              <div className="text-3xl">💑</div>
              <div className="font-bold text-maroon mt-2">{s.couple_names || "Happy couple"}</div>
              <div className="text-[11px] text-gray-500">{s.district} · ❤️ {s.likes ?? 0}</div>
              <p className="text-[13px] text-gray-700 mt-2 leading-relaxed telugu line-clamp-4">
                {String(s.text || "").slice(0, 220)}{String(s.text || "").length > 220 ? "…" : ""}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
      <div className="mt-4 text-center">
        <Link href="/stories" className="text-[13px] font-bold text-maroon underline">
          <Duo en="Read all success stories →" te="అన్ని విజయ గాథలు చదవండి →" />
        </Link>
      </div>
    </section>
  );
}

export function ReligionsStrip() {
  const items = [
    { icon: "🕉️", en: "Hindu", te: "హిందూ", d: "All castes A–Z — Reddy, Kamma, Kapu, Yadav, SC/ST…", href: "/castes" },
    { icon: "☪️", en: "Muslim", te: "ముస్లిం", d: "Sunni, Shia + caste groups — dedicated channels", href: "/castes" },
    { icon: "✝️", en: "Christian", te: "క్రిస్టియన్", d: "All denominations — dedicated channels", href: "/castes" },
  ];
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <Reveal>
        <SectionHeading
          eyebrow={duo("All faiths welcome", "అన్ని మతాలకు స్వాగతం")}
          title={duo("Hindu • Muslim • Christian", "హిందూ • ముస్లిం • క్రిస్టియన్")}
          subtitle={duo("Select a religion — all its castes A–Z, posted to your caste channel.", "Religion select చెయ్యగానే ఆ మతం castes అన్నీ A–Z — మీ caste channel లో post.")}
          telugu
        />
      </Reveal>
      <div className="mt-5 grid md:grid-cols-3 gap-4">
        {items.map((r, i) => (
          <Reveal key={r.en} delay={i * 80}>
            <Link href={r.href} className="block bg-white rounded-2xl p-5 border border-gold/25 card-shadow hover-lift h-full">
              <div className="text-4xl">{r.icon}</div>
              <div className="font-bold text-maroon text-[17px] mt-2"><Duo en={r.en} te={r.te} /></div>
              <div className="text-[12px] text-gray-600 mt-1">{r.d}</div>
              <div className="mt-2 text-[12px] font-bold text-maroon"><Duo en="Browse castes →" te="కులాలు చూడండి →" /></div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="rounded-3xl maroon-gradient text-white p-6 md:p-10 text-center shadow-brand">
        <div className="text-4xl">💍</div>
        <h2 className="mt-2 text-2xl md:text-3xl font-bold">
          <Duo en="Your life partner is already here." te="మీ జీవిత భాగస్వామి ఇక్కడే ఉన్నారు." />
        </h2>
        <p className="mt-2 text-[13px] md:text-sm opacity-90 telugu">
          {duo("Register FREE in 3 minutes → 3 profiles → ₹99 Sambandham → number via Telegram (1 credit).",
               "3 నిమిషాల్లో ఉచిత నమోదు → 3 ప్రొఫైళ్లు → ₹99 కే సంబంధం → టెలిగ్రామ్ ద్వారా నంబర్ (1 క్రెడిట్).")}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/register" className="px-7 py-3.5 rounded-full gold-gradient text-maroon text-sm font-bold shadow-soft">
            🚀 <Duo en="Register FREE" te="ఉచిత నమోదు" />
          </Link>
          <Link href="/login" className="px-7 py-3.5 rounded-full bg-white/15 border border-white/40 text-white text-sm font-bold">
            🔑 <Duo en="Member Login" te="సభ్యుల లాగిన్" />
          </Link>
        </div>
      </div>
    </section>
  );
}
