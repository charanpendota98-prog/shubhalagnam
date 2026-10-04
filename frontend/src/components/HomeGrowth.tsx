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
                <span className="text-6xl blur-[6px] select-none opacity-80" aria-hidden>
                  {t.gender === "Groom" ? "🤵" : t.gender === "Bride" ? "👰" : "👤"}
                </span>
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" title="Profile preview">
                  <span className="text-2xl" aria-hidden>🔒</span>
                  <span className="max-w-[90%] break-words bg-black/45 text-center text-white text-[10px] font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                    {t.district || "Profile details protected"}
                  </span>
                </span>
              </div>
              <div className="min-w-0 p-3">
                <div className="break-words font-bold text-[14px] text-ink">
                  {firstName(t.full_name)}{t.age !== undefined && t.age !== null && String(t.age).trim() ? ` • ${t.age}y` : ""}
                </div>
                <div className="break-words text-[11px] text-gray-600">
                  {[t.caste, t.education, t.district].filter((value) => String(value || "").trim()).join(" · ") || "Some details not provided"}
                </div>
                {t.job ? <div className="break-words text-[11px] text-gray-500">{t.job}</div> : null}
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
    { icon: "🕉️", en: "Hindu", te: "హిందూ", d: "Selected community labels A–Z; self-description is supported.", href: "/castes" },
    { icon: "☪️", en: "Muslim", te: "ముస్లిం", d: "Selected community groups; self-description is supported.", href: "/castes" },
    { icon: "✝️", en: "Christian", te: "క్రిస్టియన్", d: "Selected denomination options; add a name if it is not listed.", href: "/castes" },
  ];
  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <Reveal>
        <SectionHeading
          eyebrow={duo("All faiths welcome", "అన్ని మతాలకు స్వాగతం")}
          title={duo("Hindu • Muslim • Christian", "హిందూ • ముస్లిం • క్రిస్టియన్")}
          subtitle={duo("Browse selected community labels and channel hubs. If yours is not shown, you can self-describe it during registration.", "ఎంపిక చేసిన కమ్యూనిటీ పేర్లు, channel hubs చూడండి. మీ పేరు కనిపించకపోతే నమోదులో స్వయంగా నమోదు చేయవచ్చు.")}
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
          <Duo en="Start your search for a meaningful connection." te="అర్థవంతమైన పరిచయం కోసం మీ అన్వేషణను ప్రారంభించండి." />
        </h2>
        <p className="mt-2 text-[13px] md:text-sm opacity-90 telugu">
          {duo("Create a profile to get started. Interest notifications and contact sharing depend on service configuration, acceptance and privacy settings.",
               "ప్రొఫైల్ సృష్టించి ప్రారంభించండి. Interest notifications మరియు contact sharing service configuration, acceptance, privacy settings పై ఆధారపడతాయి.")}
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
