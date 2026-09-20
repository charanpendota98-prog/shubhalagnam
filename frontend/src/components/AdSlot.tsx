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
    // 🏠 house promo (default)
    return (
      <div className={`rounded-2xl border border-dashed border-[#D4AF37] bg-[#FFF8E7] p-4 text-center ${className}`}>
        <p className="text-[12px] font-bold text-[#7A0C2E]">{te ? "🏪 మీ business కి wedding-season customers కావాలా?" : "🏪 Want wedding-season customers for your business?"}</p>
        <p className="mt-0.5 text-[11px] text-gray-600">📢 {te ? <>Ads — district నుంచి (₹49/day) · <a href="/vendors/campaign" className="font-bold text-[#7A0C2E] underline">Campaign start చెయ్యండి →</a></> : <>Ads — from district level (₹49/day) · <a href="/vendors/campaign" className="font-bold text-[#7A0C2E] underline">Start campaign →</a></>}</p>
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
