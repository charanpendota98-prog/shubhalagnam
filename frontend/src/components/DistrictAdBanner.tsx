"use client";

/**
 * 🎯 DISTRICT & STATE TARGETED AD BANNER
 * Dynamically fetches and renders localized advertisements tailored to the user's
 * selected district (e.g. Warangal, Visakhapatnam, Hyderabad) or state (TS / AP / All).
 */
import { useEffect, useState } from "react";
import { useLang } from "@/lib/lang";
import { WhatsAppIcon } from "@/components/BrandIcons";

type Ad = {
  id: string;
  vendor_id?: string;
  title: string;
  offer: string;
  image_url?: string;
  banner_url?: string;
  video_url?: string;
  link?: string;
  phone?: string;
  whatsapp?: string;
  category?: string;
  level?: string;
  districts?: string[];
  state?: string;
};

export default function DistrictAdBanner({
  slot = "matches_sidebar",
  district = "",
  state = "",
  className = "",
  compact = false,
}: {
  slot?: string;
  district?: string;
  state?: string;
  className?: string;
  compact?: boolean;
}) {
  const { lang } = useLang();
  const te = lang === "te";
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAds() {
      try {
        const params = new URLSearchParams();
        if (slot) params.set("slot", slot);
        if (district) params.set("district", district);
        if (state) params.set("state", state);
        params.set("limit", compact ? "1" : "2");

        const r = await fetch(`/api/ads/list?${params.toString()}`);
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled && d.ok && d.ads?.length) {
          setAds(d.ads);
        }
      } catch {
        // graceful fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAds();
    return () => {
      cancelled = true;
    };
  }, [slot, district, state, compact]);

  const handleAdClick = (adId: string) => {
    fetch(`/api/ads/${encodeURIComponent(adId)}/click`, { method: "POST" }).catch(() => {});
  };

  if (loading || !ads.length) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {ads.map((ad) => {
        const waNumber = ad.whatsapp || ad.phone || "9876543210";
        const waText = encodeURIComponent(
          `నమస్తే, మన వివాహ (Mana Vivaha) లో మీ ప్రకటన చూసి సంప్రదిస్తున్నాను: ${ad.title}`
        );
        const waUrl = ad.link || `https://wa.me/91${waNumber.replace(/[^0-9]/g, "")}?text=${waText}`;

        const locationBadge =
          ad.level === "district" && ad.districts?.length
            ? `📍 ${ad.districts.slice(0, 2).join(", ")} లోకల్ సేవలు`
            : ad.level === "state"
            ? `🏛️ ${ad.state === "TS" ? "తెలంగాణ రాష్ట్రవ్యాప్తంగా" : "ఆంధ్రప్రదేశ్ రాష్ట్రవ్యాప్తంగా"}`
            : "👑 TS & AP ప్రసిద్ధ సేవలు";

        if (compact) {
          return (
            <div
              key={ad.id}
              className="bg-gradient-to-r from-amber-50 via-white to-rose-50 border border-gold/40 rounded-2xl p-3 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-maroon">
                  {locationBadge}
                </span>
                <span className="text-[9px] font-bold text-gray-400">Sponsored</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[13px] text-maroon truncate">{ad.title}</p>
                  <p className="text-[11px] text-gray-600 truncate">{ad.offer}</p>
                </div>
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => handleAdClick(ad.id)}
                  className="shrink-0 flex items-center gap-1 bg-[#25D366] text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-sm hover:brightness-110 active:scale-95 transition"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" mono />
                  <span>{te ? "సంప్రదించండి" : "Enquire"}</span>
                </a>
              </div>
            </div>
          );
        }

        return (
          <div
            key={ad.id}
            className="bg-white rounded-2xl border border-gold/30 p-4 card-shadow hover:border-gold/60 transition flex flex-col sm:flex-row gap-3.5 items-start sm:items-center justify-between"
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              {ad.image_url ? (
                <img
                  src={ad.image_url}
                  alt={ad.title}
                  className="w-16 h-16 rounded-xl object-cover border border-gold/20 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-2xl shrink-0">
                  💍
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold/15 text-maroon">
                    {locationBadge}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    ✓ Verified
                  </span>
                </div>
                <h4 className="font-extrabold text-[14px] text-navy leading-snug">
                  {ad.title}
                </h4>
                <p className="text-[12px] text-maroon font-semibold leading-snug">
                  {ad.offer}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleAdClick(ad.id)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-[#25D366] text-white font-bold text-[12px] px-4 py-2 rounded-xl shadow-soft hover:brightness-110 active:scale-95 transition"
              >
                <WhatsAppIcon className="w-4 h-4" mono />
                <span>{te ? "వివరాలు / బుకింగ్" : "Book / Enquire"}</span>
              </a>
              {ad.phone && (
                <a
                  href={`tel:${ad.phone}`}
                  onClick={() => handleAdClick(ad.id)}
                  className="flex items-center justify-center border border-navy/20 text-navy font-bold text-[12px] px-3 py-2 rounded-xl hover:bg-gray-50"
                  title="Call Vendor"
                >
                  📞
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
