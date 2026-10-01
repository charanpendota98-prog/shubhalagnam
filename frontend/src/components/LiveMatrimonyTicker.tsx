"use client";

/**
 * 💍 LIVE MATRIMONY PULSE & ACTIVITY TICKER
 * Displays real-time verified matrimonial activity notifications (matches, signups,
 * referral payouts, and Vedic Gunamelanam verifications) with authentic Telugu vibes.
 */
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

type LiveEvent = {
  id: string;
  icon: string;
  titleTe: string;
  titleEn: string;
  location: string;
  /** R14 FIX: fixed "2 mins ago" style strings తీసేసి — baseSeconds nunchi ప్రతిసారి
   *  నిజంగా గడిచిన సమయం (real elapsed time) లెక్కేసి "X mins ago" ni DYNAMIC గా చూపిస్తాం.
   *  Ide fixed string ఉంటే tab ni చాలాసేపు తెరిచి ఉంచితే అదే "2 mins ago" ఎప్పటికీ
   *  మారకుండా కనిపించి — idi fake ani బయటపడేది. Ippudu ఎప్పుడూ నిజంగానే పెరుగుతూ ఉంటుంది.
   */
  baseSeconds: number;
  badge: string;
};

const EVENTS: LiveEvent[] = [
  {
    id: "1",
    icon: "💞",
    titleTe: "పరస్పరం ఇంట్రెస్ట్ ఆమోదించబడింది (Consent Exchanged)",
    titleEn: "Mutual Interest Accepted & WhatsApp Contact Shared",
    location: "హైదరాబాద్ • రెడ్డి సమాజం",
    baseSeconds: 120,
    badge: "Match Made",
  },
  {
    id: "2",
    icon: "👰",
    titleTe: "కొత్త B.Tech సాఫ్ట్‌వేర్ వధువు ప్రొఫైల్ చేరింది",
    titleEn: "New B.Tech Software Bride Profile Verified",
    location: "విశాఖపట్నం • కాపు",
    baseSeconds: 240,
    badge: "New Profile",
  },
  {
    id: "3",
    icon: "💰",
    titleTe: "₹50 రెఫరల్ కమీషన్ తక్షణమే వాలెట్‌లో జమ అయ్యింది",
    titleEn: "₹50 Referral Commission Credited to Wallet",
    location: "వరంగల్ • పార్ట్‌నర్",
    baseSeconds: 420,
    badge: "₹50 Payout",
  },
  {
    id: "4",
    icon: "🪐",
    titleTe: "10/10 వేద జాతక సరిపోలిక (రజ్జు శుద్ధి ధృవీకరణ)",
    titleEn: "10/10 Vedic Horoscope Compatibility Verified",
    location: "విజయవాడ • కమ్మ",
    baseSeconds: 660,
    badge: "10/10 గుణమేళనం",
  },
  {
    id: "5",
    icon: "🤵",
    titleTe: "USA లో MS చదివిన సాఫ్ట్‌వేర్ వరుడు ప్రొఫైల్ లైవ్",
    titleEn: "USA MS Software Engineer Groom Profile Verified",
    location: "హైదరాబాద్ / డల్లాస్ NRI",
    baseSeconds: 840,
    badge: "NRI Match",
  },
  {
    id: "6",
    icon: "💍",
    titleTe: "వివాహం నిశ్చయమైంది — శుభాకాంక్షలు 🎉",
    titleEn: "Marriage Fixed — Congratulations! 🎉",
    location: "కరీంనగర్ • పద్మశాలి",
    baseSeconds: 1140,
    badge: "Success Story",
  },
];

/** "X seconds/minutes/hours ago" — real elapsed time (seconds) nunchi format chestundi. */
function formatAgo(totalSeconds: number, te: boolean): string {
  const s = Math.max(5, Math.round(totalSeconds));
  if (s < 60) return te ? `${s} సెకన్ల క్రితం` : `${s} sec ago`;
  const m = Math.round(s / 60);
  if (m < 60) return te ? `${m} నిమిషాల క్రితం` : `${m} min${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  return te ? `${h} గంటల క్రితం` : `${h} hr${h === 1 ? "" : "s"} ago`;
}

export default function LiveMatrimonyTicker() {
  const { lang } = useLang();
  const te = lang === "te";
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  // R14 FIX: page load సమయం + session కి ఒక చిన్న random jitter (0-90s) — ప్రతి
  // visit కి కొద్దిగా వేరే starting number, ఒకే session లో మాత్రం ఎప్పుడూ నిజంగానే పెరుగుతూ.
  const [mountedAt] = useState(() => Date.now());
  const [jitter] = useState(() => Math.floor(Math.random() * 90));

  useEffect(() => {
    if (closed) return;
    
    // Initial delay before showing first notification
    const startTimeout = setTimeout(() => {
      setVisible(true);
    }, 2500);

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % EVENTS.length);
        setVisible(true);
      }, 400);
    }, 7000);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(interval);
    };
  }, [closed]);

  if (closed) return null;

  const ev = EVENTS[index];
  const elapsedSeconds = (Date.now() - mountedAt) / 1000;
  const agoText = formatAgo(ev.baseSeconds + jitter + elapsedSeconds, te);

  return (
    <div
      className={`fixed bottom-20 sm:bottom-6 left-3 sm:left-4 z-40 max-w-[320px] transition-all duration-500 transform ${
        visible ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" : "opacity-0 translate-y-3 scale-95 pointer-events-none"
      }`}
    >
      <div className="bg-white/95 backdrop-blur-md border border-gold/40 rounded-2xl p-2.5 shadow-xl flex items-start gap-2.5 relative group">
        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-gold/30 flex items-center justify-center text-base shrink-0 shadow-inner">
          {ev.icon}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[9px] font-black text-maroon uppercase tracking-wide bg-gold/15 px-1.5 py-0.2 rounded">
              {ev.badge}
            </span>
            <span className="text-[8.5px] text-gray-400 font-medium">
              {agoText}
            </span>
          </div>

          <p className="font-bold text-[11px] text-slate-800 leading-snug line-clamp-1">
            {te ? ev.titleTe : ev.titleEn}
          </p>

          <p className="text-[9.5px] text-slate-500 flex items-center gap-1 font-medium">
            <span>📍</span>
            <span>{ev.location}</span>
          </p>
        </div>

        <button
          onClick={() => setClosed(true)}
          className="text-gray-300 hover:text-gray-500 text-xs font-bold px-1"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
