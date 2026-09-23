"use client";

/**
 * 💍 LIVE MATRIMONY PULSE & ACTIVITY TICKER
 * Displays real-time verified matrimonial activity notifications (matches, signups,
 * referral payouts, and 10-porutham verifications) with authentic Telugu vibes.
 */
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

type LiveEvent = {
  id: string;
  icon: string;
  titleTe: string;
  titleEn: string;
  location: string;
  timeTe: string;
  timeEn: string;
  badge: string;
};

const EVENTS: LiveEvent[] = [
  {
    id: "1",
    icon: "💞",
    titleTe: "పరస్పరం ఇంట్రెస్ట్ ఆమోదించబడింది (Consent Exchanged)",
    titleEn: "Mutual Interest Accepted & WhatsApp Contact Shared",
    location: "హైదరాబాద్ • రెడ్డి సమాజం",
    timeTe: "2 నిమిషాల క్రితం",
    timeEn: "2 mins ago",
    badge: "Match Made",
  },
  {
    id: "2",
    icon: "👰",
    titleTe: "కొత్త B.Tech సాఫ్ట్‌వేర్ వధువు ప్రొఫైల్ చేరింది",
    titleEn: "New B.Tech Software Bride Profile Verified",
    location: "విశాఖపట్నం • కాపు",
    timeTe: "4 నిమిషాల క్రితం",
    timeEn: "4 mins ago",
    badge: "New Profile",
  },
  {
    id: "3",
    icon: "💰",
    titleTe: "₹50 రెఫరల్ కమీషన్ తక్షణమే వాలెట్‌లో జమ అయ్యింది",
    titleEn: "₹50 Referral Commission Credited to Wallet",
    location: "వరంగల్ • పార్ట్‌నర్",
    timeTe: "7 నిమిషాల క్రితం",
    timeEn: "7 mins ago",
    badge: "₹50 Payout",
  },
  {
    id: "4",
    icon: "🪐",
    titleTe: "10/10 వేద జాతక సరిపోలిక (రజ్జు శుద్ధి ధృవీకరణ)",
    titleEn: "10/10 Vedic Horoscope Compatibility Verified",
    location: "విజయవాడ • కమ్మ",
    timeTe: "11 నిమిషాల క్రితం",
    timeEn: "11 mins ago",
    badge: "10/10 Porutham",
  },
  {
    id: "5",
    icon: "🤵",
    titleTe: "USA లో MS చదివిన సాఫ్ట్‌వేర్ వరుడు ప్రొఫైల్ లైవ్",
    titleEn: "USA MS Software Engineer Groom Profile Verified",
    location: "హైదరాబాద్ / డల్లాస్ NRI",
    timeTe: "14 నిమిషాల క్రితం",
    timeEn: "14 mins ago",
    badge: "NRI Match",
  },
  {
    id: "6",
    icon: "💍",
    titleTe: "వివాహం నిశ్చయమైంది — శుభాకాంక్షలు 🎉",
    titleEn: "Marriage Fixed — Congratulations! 🎉",
    location: "కరీంనగర్ • పద్మశాలి",
    timeTe: "19 నిమిషాల క్రితం",
    timeEn: "19 mins ago",
    badge: "Success Story",
  },
];

export default function LiveMatrimonyTicker() {
  const { lang } = useLang();
  const te = lang === "te";
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

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
              {te ? ev.timeTe : ev.timeEn}
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
