"use client";
/**
 * 🌟 PROFILES OF THE DAY & SPOTLIGHT SHOWCASE (WAVE 42)
 * =========================================================
 * High-visibility, high-converting showcase for paid promoted profiles.
 * Users pay (₹99 / ₹199 / ₹499) → Admin approves → Shown with verified badge,
 * high-res photo, video preview player, custom pitch, and direct action buttons.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { Duo, duo } from "@/lib/duo";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";

export type SpotlightProfile = {
  promo_id: string;
  tsap_id: string;
  full_name: string;
  gender: "Bride" | "Groom" | string;
  age: number;
  caste: string;
  subcaste?: string;
  district: string;
  education?: string;
  job?: string;
  income?: string;
  height?: string;
  marital_status?: string;
  badge_text: string;
  headline: string;
  pitch_text: string;
  photo_url?: string;
  video_url?: string;
  media_type?: string;
  amount_paid?: number;
  views_count?: number;
};

const DEFAULT_SPOTLIGHTS: SpotlightProfile[] = [
  {
    promo_id: "SPOT-001",
    tsap_id: "MV1001",
    full_name: "శ్రావణి రెడ్డి (Sravani Reddy)",
    gender: "Bride",
    age: 25,
    caste: "Reddy",
    subcaste: "Motati",
    district: "Hyderabad / Nalgonda",
    education: "B.Tech CSE",
    job: "Senior Software Engineer (16 LPA)",
    height: "5 ft 4 in",
    badge_text: "⭐ నేటి విశేష సంబంధం",
    headline: "సాఫ్ట్‌వేర్ ప్రొఫెషనల్ · సంప్రదాయ కుటుంబం",
    pitch_text: "ఉన్నత విద్యావంతురాలు, సంస్కారవంతమైన కుటుంబ నేపథ్యం. సాఫ్ట్‌వేర్ రంగంలో స్థిరపడిన వరుడు కావలెను.",
    photo_url: "/promo/bride-card.jpg",
  },
  {
    promo_id: "SPOT-002",
    tsap_id: "MV1002",
    full_name: "రాజేష్ చౌదరి (Rajesh Chowdary)",
    gender: "Groom",
    age: 28,
    caste: "Kamma",
    district: "Vijayawada / USA",
    education: "MS in Data Science (USA)",
    job: "Data Architect, Microsoft (H1B)",
    height: "5 ft 10 in",
    badge_text: "✈️ NRI SPOTLIGHT",
    headline: "యూఎస్ స్థిరపడిన ప్రొఫెషనల్ · కృష్ణా జిల్లా",
    pitch_text: "అమెరికాలో మంచి ఉద్యోగంలో స్థిరపడిన వరుడు. విద్యావంతురాలైన సంప్రదాయ వధువు కావలెను.",
    photo_url: "/promo/groom-kamma.jpg",
  },
  {
    promo_id: "SPOT-003",
    tsap_id: "MV1003",
    full_name: "దివ్య తేజస్వి (Divya Tejaswi)",
    gender: "Bride",
    age: 24,
    caste: "Kapu",
    district: "Visakhapatnam",
    education: "MBBS, MD General Medicine",
    job: "Resident Doctor, Apollo Hospitals",
    height: "5 ft 5 in",
    badge_text: "🩺 DOCTOR ALLIANCE",
    headline: "డాక్టర్ వధువు · విశాఖపట్నం సంప్రదాయ కుటుంబం",
    pitch_text: "మెడికల్ లేదా సివిల్స్/ఐటీ రంగంలో స్థిరపడిన అనుకూలమైన వరుని కోసం చూస్తున్నాము.",
    photo_url: "/promo/bride-kapu.jpg",
  },
];

export default function ProfilesOfTheDay() {
  const { lang } = useLang();
  const te = lang === "te";
  const [profiles, setProfiles] = useState<SpotlightProfile[]>(DEFAULT_SPOTLIGHTS);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [sentInterest, setSentInterest] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/spotlight/active?limit=6")
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && Array.isArray(d.items) && d.items.length > 0) {
          setProfiles(d.items);
        }
      })
      .catch(() => {});
  }, []);

  const handleInterest = (promoId: string, tsapId: string) => {
    setSentInterest((prev) => ({ ...prev, [promoId]: true }));
    fetch(`/api/spotlight/track/${promoId}?kind=interest`, { method: "POST" }).catch(() => {});
  };

  const handleTrackClick = (promoId: string) => {
    fetch(`/api/spotlight/track/${promoId}?kind=click`, { method: "POST" }).catch(() => {});
  };

  return (
    <section className="relative max-w-7xl mx-auto px-4 py-10" aria-label="Profiles of the Day">
      {/* Decorative background glow */}
      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-amber-100/60 via-rose-100/50 to-gold-soft/40 blur-3xl rounded-full" />
      </div>

      <Reveal>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <SectionHeading
            eyebrow={duo("⭐ Verified Spotlights", "⭐ నేటి విశేష సంబంధాలు")}
            title={duo("Profiles of the Day 🌟", "ఈ రోజు ప్రత్యేక ప్రొఫైళ్లు (Spotlight) 🌟")}
            subtitle={duo(
              "Top verified profiles promoted by families for faster alliance matches.",
              "త్వరిత వివాహ సంబంధం కోసం కుటుంబాలు ప్రత్యేకంగా ప్రమోట్ చేసిన ధృవీకరించిన ప్రొఫైళ్లు."
            )}
            telugu
          />

          <Link
            href="/spotlight"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full gold-gradient text-[#5c0821] font-black text-xs sm:text-sm shadow-gold hover:scale-105 active:scale-95 transition-all whitespace-nowrap self-start sm:self-auto border border-[#B8860B]/40"
          >
            <span>⚡ {te ? "మీ ప్రొఫైల్ ని ప్రమోట్ చేసుకోండి (₹99)" : "Promote Your Profile (₹99)"}</span>
            <span>→</span>
          </Link>
        </div>
      </Reveal>

      {/* Profile Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((p, idx) => {
          const isBride = p.gender === "Bride";
          const hasVideo = !!p.video_url;
          const photo = p.photo_url || (isBride ? "/promo/cine-3.jpg" : "/promo/cine-1.jpg");

          return (
            <Reveal key={p.promo_id || idx} delay={idx * 80}>
              <div className="group relative bg-white/95 backdrop-blur-sm rounded-3xl overflow-hidden border border-amber-300/60 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                
                {/* Media Container: Photo / Video */}
                <div className="relative h-64 bg-slate-900 overflow-hidden">
                  <img
                    src={photo}
                    alt={p.full_name}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  {/* Top Badge */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-maroon shadow-md border border-white/40">
                      <span>✨</span>
                      <span>{p.badge_text || (te ? "నేటి ప్రత్యేక ప్రొఫైల్" : "PROFILE OF THE DAY")}</span>
                    </span>

                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                      ID: {p.tsap_id}
                    </span>
                  </div>

                  {/* Video Play Button Overlay if video is present */}
                  {hasVideo && (
                    <button
                      type="button"
                      onClick={() => setActiveVideo(p.video_url || null)}
                      className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-maroon/80 hover:bg-maroon text-white flex items-center justify-center text-xl shadow-2xl border-2 border-gold hover:scale-110 active:scale-95 transition-all"
                      aria-label="Play video intro"
                    >
                      ▶
                    </button>
                  )}

                  {/* Bottom Image Details (Name + Age + Verified) */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-lg sm:text-xl drop-shadow truncate">
                        {p.full_name}
                      </h3>
                      <span className="text-emerald-400 text-sm font-bold drop-shadow" title="Verified Profile">
                        ✓
                      </span>
                    </div>
                    <div className="text-xs text-amber-200 font-medium">
                      {p.age} Yrs · {p.height || "5 ft 8 in"} · {p.caste} {p.subcaste ? `(${p.subcaste})` : ""}
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Headline & Pitch */}
                  <div className="space-y-2">
                    <div className="inline-block px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-maroon font-bold text-xs leading-tight">
                      📍 {p.headline || `${p.job || "Professional"} from ${p.district}`}
                    </div>

                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed italic bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      &ldquo;{p.pitch_text}&rdquo;
                    </p>

                    {/* Key Attributes Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="bg-white border border-gray-100 p-2 rounded-xl">
                        <span className="text-gray-400 block text-[10px]">{te ? "విద్య / ఉద్యోగం" : "Edu & Job"}</span>
                        <span className="font-semibold text-gray-800 truncate block">{p.job || p.education || "Professional"}</span>
                      </div>
                      <div className="bg-white border border-gray-100 p-2 rounded-xl">
                        <span className="text-gray-400 block text-[10px]">{te ? "ప్రాంతం" : "Location"}</span>
                        <span className="font-semibold text-gray-800 truncate block">🏡 {p.district}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleInterest(p.promo_id, p.tsap_id)}
                        disabled={sentInterest[p.promo_id]}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer ${
                          sentInterest[p.promo_id]
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "maroon-gradient text-white hover:brightness-110 active:scale-95"
                        }`}
                      >
                        <span>{sentInterest[p.promo_id] ? "✅" : "💍"}</span>
                        <span>
                          {sentInterest[p.promo_id]
                            ? (te ? "సంబంధం కోరాం" : "Interest Sent")
                            : (te ? "ఉచిత సంబంధం పంపండి" : "Send Free Interest")}
                        </span>
                      </button>

                      <Link
                        href={`/search/${p.tsap_id}`}
                        onClick={() => handleTrackClick(p.promo_id)}
                        className="py-2.5 px-3 rounded-xl text-xs font-bold border border-gold text-maroon hover:bg-gold-soft transition-colors flex items-center justify-center cursor-pointer"
                      >
                        {te ? "వివరాలు →" : "View →"}
                      </Link>
                    </div>

                    {hasVideo && (
                      <button
                        type="button"
                        onClick={() => setActiveVideo(p.video_url || null)}
                        className="w-full py-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>🎥</span>
                        <span>{te ? "వీడియో ఇంట్రో చూడండి" : "Watch Video Pitch"}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Video Modal Player */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-black rounded-3xl overflow-hidden shadow-2xl border border-gold/40"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 bg-slate-900 text-white">
              <span className="text-xs font-bold text-amber-300">🌟 {te ? "ప్రొఫైల్ వీడియో ఇంట్రో" : "Profile Video Intro"}</span>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="aspect-video w-full bg-black">
              {activeVideo.includes("youtube.com") || activeVideo.includes("youtu.be") ? (
                <iframe
                  src={`${activeVideo}?autoplay=1`}
                  title="Profile Video"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={activeVideo} controls autoPlay className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
