"use client";

/**
 * Homepage profile previews, member-submitted stories, and community links.
 * Copy distinguishes member-submitted details from independent identity checks.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Duo, duo } from "@/lib/duo";
import { apiDisplayMessage } from "@/lib/api";
import { useLang } from "@/lib/lang";
import { apiGet } from "@/lib/api";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";

type Teaser = {
  tsap_id?: string; full_name?: string; age?: number | string; gender?: string;
  caste?: string; education?: string; job?: string; district?: string; state?: string;
};
type Story = {
  story_id?: string; couple_names?: string; text?: string; story_en?: string; story_te?: string;
  photo_url?: string; district?: string;
};

function firstName(n?: string) {
  return String(n || "").split(" ")[0] || "Member";
}

export function TeaserStrip() {
  const { lang } = useLang();
  const te = lang === "te";
  const displayField = (value?: string) => te
    ? String(value || "")
    : apiDisplayMessage({ message_en: value }, false, "");
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
          eyebrow={duo("Member-submitted previews", "సభ్యులు సమర్పించిన ప్రివ్యూలు")}
          title={duo("Explore profile previews at your pace.", "మీ వేగంతో ప్రొఫైల్ ప్రివ్యూలను చూడండి.")}
          subtitle={duo("Profile details are member-provided and are not independently verified. Owner acceptance grants contact access in accepted-request account views; notification delivery is not guaranteed.", "ప్రొఫైల్ వివరాలు సభ్యులు అందించినవి; స్వతంత్రంగా నిర్ధారించినవి కావు. Owner accept చేసిన తర్వాత accepted-request account views లో contact access వస్తుంది; notification delivery హామీ లేదు.")}
          telugu
        />
      </Reveal>
      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {rows.map((t, i) => {
          const caste = displayField(t.caste);
          const education = displayField(t.education);
          const district = displayField(t.district);
          const job = displayField(t.job);
          const details = [caste, education, district].filter(Boolean);
          return (
            <Reveal key={String(t.tsap_id || i)} delay={i * 60}>
              <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-white card-shadow">
                <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br from-maroon via-[#5c0822] to-gold-deep">
                  <span aria-hidden className="pointer-events-none absolute inset-0 opacity-25"
                    style={{ backgroundImage: "radial-gradient(circle at 20% 25%, rgba(255,255,255,.35) 0, transparent 42%), radial-gradient(circle at 82% 75%, rgba(212,175,55,.5) 0, transparent 45%)" }} />
                  <span className="select-none text-6xl opacity-80 blur-[6px]" aria-hidden>
                    {t.gender === "Groom" ? "🤵" : t.gender === "Bride" ? "👰" : "👤"}
                  </span>
                  <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" title={te ? "ప్రొఫైల్ ప్రివ్యూ" : "Profile preview"}>
                    <span className="text-2xl" aria-hidden>🔒</span>
                    <span className="max-w-[90%] break-words rounded-full bg-black/45 px-3 py-1 text-center text-[10px] font-bold text-white backdrop-blur-sm">
                      {district || (te ? "ప్రొఫైల్ వివరాలు రక్షించబడ్డాయి" : "Profile details protected")}
                    </span>
                  </span>
                </div>
                <div className="min-w-0 p-3">
                  <div className="break-words text-[14px] font-bold text-ink">
                    {firstName(t.full_name)}{t.age !== undefined && t.age !== null && String(t.age).trim() ? ` • ${t.age} ${te ? "సం." : "years"}` : ""}
                  </div>
                  <div className={`break-words text-[11px] text-gray-600 ${te ? "telugu" : ""}`}>
                    {details.join(" · ") || (te ? "వివరాలు ఇవ్వలేదు" : "No profile details are available in English.")}
                  </div>
                  {job ? <div className={`break-words text-[11px] text-gray-500 ${te ? "telugu" : ""}`}>{job}</div> : null}
                  <Link href="/register" className="mt-2 block rounded-xl maroon-gradient py-2 text-center text-[12px] font-bold text-white">
                    <Duo en="Create a profile" te="ప్రొఫైల్ సృష్టించండి" />
                  </Link>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function StoriesStrip() {
  const { lang } = useLang();
  const te = lang === "te";
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
          eyebrow={duo("Member stories", "సభ్యుల కథనాలు")}
          title={duo("Stories shared by members.", "సభ్యులు పంచుకున్న కథనాలు.")}
          subtitle={duo("Submitted stories are shown after review; review does not independently verify identity or relationship details.", "సభ్యులు పంపిన కథనాలు సమీక్ష తర్వాత చూపబడతాయి; ఆ సమీక్ష గుర్తింపు లేదా సంబంధ వివరాలను స్వతంత్రంగా నిర్ధారించదు.")}
          telugu
        />
      </Reveal>
      <div className="mt-5 grid md:grid-cols-3 gap-4">
        {rows.map((s, i) => {
          const district = te
            ? String(s.district || "")
            : apiDisplayMessage({ message_en: s.district }, false, "");
          const storyText = te
            ? String(s.story_te || s.text || "")
            : apiDisplayMessage({ message_en: s.story_en || s.text }, false, "An English version of this story is not available.");
          return (
            <Reveal key={String(s.story_id || i)} delay={i * 80}>
              <div className="h-full rounded-2xl border border-gold/25 bg-white p-5 card-shadow">
                <div className="text-3xl" aria-hidden="true">💬</div>
                <div className="mt-2 break-words font-bold text-maroon">{s.couple_names || <Duo en="Member story" te="సభ్యుల కథనం" />}</div>
                {district ? <div className="break-words text-[11px] text-gray-500">📍 {district}</div> : null}
                <p lang={te ? "te-IN" : "en-IN"} className={`mt-2 line-clamp-4 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-gray-700 ${te ? "telugu" : ""}`}>
                  {storyText.length > 220 ? `${storyText.slice(0, 220)}…` : storyText}
                </p>
              </div>
            </Reveal>
          );
        })}
      </div>
      <div className="mt-4 text-center">
        <Link href="/stories" className="text-[13px] font-bold text-maroon underline">
          <Duo en="Read member stories →" te="సభ్యుల కథనాలు చదవండి →" />
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
          {duo("Create a profile to get started. After owner acceptance, contact details appear in accepted-request account views; notification delivery is not guaranteed.",
               "ప్రొఫైల్ సృష్టించి ప్రారంభించండి. Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి; notification delivery హామీ లేదు.")}
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
