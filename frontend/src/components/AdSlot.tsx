"use client";
/**
 * 📢 WAVE 13 — targeted AdSlot (district/state scope).
 * No ad → house promo (khaali vaddu, revenue + UX).
 */
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";

type Ad = {
  id: string; vendor_id: string; title: string; offer: string;
  image_url: string; banner_url: string; video_url: string; link: string;
};

export default function AdSlot({ slot, district = "", state = "", className = "" }: {
  slot: "home_hero" | "matches_sidebar" | "profile_banner" | "search_top";
  district?: string; state?: string; className?: string;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const [ad, setAd] = useState<Ad | null>(null);

  // Trust rule: never place paid promotions inside matching, profile, or search flows.
  // Keep the component defensive so a future page cannot accidentally violate it.
  const isProtectedFlow = slot === "matches_sidebar" || slot === "profile_banner" || slot === "search_top";

  useEffect(() => {
    if (isProtectedFlow) return;
    let live = true;
    const q = new URLSearchParams({ slot, district, state });
    fetch(`/api/ads?${q.toString()}`)
      .then((r) => r.json())
      .then((d) => { if (live && d.ok && d.ad) setAd(d.ad); })
      .catch(() => { });
    return () => { live = false; };
  }, [slot, district, state]);

  if (isProtectedFlow) return null;

  const onClick = () => {
    if (!ad) return;
    fetch(`/api/ads/${ad.id}/click`, { method: "POST" }).catch(() => { });
    if (ad.link) window.open(ad.link, "_blank");
  };

  if (!ad) {
    // 🏠 house promo (compact & sleek)
    return (
      <div className={`rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 px-4 py-2.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left ${className}`}>
        <div className="flex items-center gap-2">
          <span className="text-base">🏪</span>
          <p className="text-xs font-bold text-[#7A0C2E]">
            {te ? "మీ Business కి Wedding-Season Customers కావాలా?" : "Want wedding-season customers for your business?"}
            <span className="hidden md:inline font-normal text-gray-600 text-[11px] ml-2">
              {te ? "జిల్లా స్థాయిలో ప్రకటనలు (₹49/రోజు నుండి)" : "District-level ads from ₹49/day"}
            </span>
          </p>
        </div>
        <a
          href="/vendors/campaign"
          className="shrink-0 px-3.5 py-1 rounded-xl bg-[#7A0C2E] hover:bg-[#5C0822] text-white font-bold text-[11px] transition shadow-xs"
        >
          {te ? "ప్రకటన వేయండి →" : "Start Campaign →"}
        </a>
      </div>
    );
  }
  const img = ad.banner_url || ad.image_url;
  return (
    <div className={`overflow-hidden rounded-2xl border border-[#D4AF37]/60 bg-white shadow-sm ${className}`}>
      <button onClick={onClick} className="block w-full text-left">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={ad.title} className="max-h-56 w-full object-cover" loading="lazy" />
        ) : null}
        <div className="p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">📢 Sponsored</p>
          <p className="text-sm font-extrabold text-[#0F1F3C]">{ad.title}</p>
          {ad.offer ? <p className="mt-0.5 text-[12px] font-bold text-green-700">🎁 {ad.offer}</p> : null}
          {ad.video_url ? <p className="mt-1 text-[11px] text-[#7A0C2E]">{te ? "▶️ Video చూడండి" : "▶️ Watch video"}</p> : null}
        </div>
      </button>
    </div>
  );
}
