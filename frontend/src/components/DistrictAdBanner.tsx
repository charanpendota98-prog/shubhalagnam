"use client";


import { readApiJson } from "@/lib/api";
/**
 * 🎯 DISTRICT & STATE TARGETED AD BANNER
 * Dynamically fetches and renders localized advertisements tailored to the user's
 * selected district (e.g. Warangal, Visakhapatnam, Hyderabad) or state (TS / AP / All).
 */
import { useEffect, useState } from "react";
import Image from "next/image";
import { useLang } from "@/lib/lang";
import { WhatsAppIcon } from "@/components/BrandIcons";
import { whatsappPhoneLink } from "@/lib/wa";

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

function safeAdvertiserUrl(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw || raw.startsWith("//") || /[\u0000-\u001f\u007f]/.test(raw)) return "";
  if (raw.startsWith("/") && !raw.startsWith("/\\")) return raw;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function isWhatsAppContactUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    const hostname = url.hostname.toLowerCase();
    if (hostname === "wa.me") return /^\+?\d{8,15}$/.test(url.pathname.replace(/^\//, ""));
    if (hostname === "api.whatsapp.com") {
      return url.pathname === "/send" && /^\+?\d{8,15}$/.test(url.searchParams.get("phone") || "");
    }
    return false;
  } catch {
    return false;
  }
}

function safeTelLink(value?: string): string {
  const raw = String(value || "").trim();
  if (!raw || /[\u0000-\u001f\u007f]/.test(raw)) return "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? `tel:${digits}` : "";
}

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
        const d = await readApiJson(r);
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
        const waText = `నమస్తే, మన వివాహ (Mana Vivaha) లో మీ ప్రకటన చూసి సంప్రదిస్తున్నాను: ${ad.title}`;
        const suppliedLink = safeAdvertiserUrl(ad.link);
        const directWhatsAppLink = suppliedLink && isWhatsAppContactUrl(suppliedLink) ? suppliedLink : "";
        const configuredWhatsApp = ad.whatsapp ? whatsappPhoneLink(ad.whatsapp, waText) || "" : "";
        const whatsappUrl = directWhatsAppLink || configuredWhatsApp;
        const advertiserUrl = suppliedLink && !directWhatsAppLink ? suppliedLink : "";
        const phoneUrl = safeTelLink(ad.phone);
        const destination = whatsappUrl || advertiserUrl || phoneUrl;
        const destinationKind = whatsappUrl ? "whatsapp" : advertiserUrl ? "link" : phoneUrl ? "phone" : "none";
        const destinationLabel = destinationKind === "whatsapp"
          ? (te ? "WhatsApp ద్వారా వివరాలు" : "WhatsApp")
          : destinationKind === "link"
          ? (te ? "ప్రకటన వివరాలు" : "View advertiser link")
          : destinationKind === "phone"
          ? (te ? "వ్యాపారానికి కాల్ చేయండి" : "Call business")
          : "";

        const locationBadge = ad.level === "district" && ad.districts?.length
          ? `${te ? "📍 ప్రకటన ప్రదర్శన" : "📍 Ad placement"} · ${ad.districts.slice(0, 2).join(", ")}`
          : ad.level === "state"
          ? `${te ? "🏛️ రాష్ట్ర ప్రకటన ప్రదర్శన" : "🏛️ State ad placement"} · ${ad.state === "TS" ? "TS" : "AP"}`
          : (te ? "🗺️ TS + AP ప్రకటన ప్రదర్శన" : "🗺️ TS + AP ad placement");

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
                <span className="text-[9px] font-bold text-gray-400">{te ? "ప్రాయోజిత ప్రకటన" : "Sponsored"}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[13px] text-maroon truncate">{ad.title}</p>
                  <p className="text-[11px] text-gray-600 truncate">{ad.offer}</p>
                </div>
                {destination ? (
                  <a
                    href={destination}
                    target={destination.startsWith("https://") ? "_blank" : undefined}
                    rel={destination.startsWith("https://") ? "noopener noreferrer" : undefined}
                    onClick={() => handleAdClick(ad.id)}
                    className={`shrink-0 flex items-center gap-1 font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-sm hover:brightness-110 active:scale-95 transition ${destinationKind === "whatsapp" ? "bg-[#25D366] text-white" : "bg-[#7A0C2E] text-white"}`}
                  >
                    {destinationKind === "whatsapp" ? <WhatsAppIcon className="w-3.5 h-3.5" mono /> : null}
                    <span>{destinationLabel}</span>
                  </a>
                ) : null}
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
                <Image
                  src={ad.image_url}
                  alt={ad.title}
                  width={64}
                  height={64}
                  unoptimized
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
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900">
                    {te ? "ప్రాయోజిత ప్రకటన" : "Sponsored"}
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
              {destination ? (
                <a
                  href={destination}
                  target={destination.startsWith("https://") ? "_blank" : undefined}
                  rel={destination.startsWith("https://") ? "noopener noreferrer" : undefined}
                  onClick={() => handleAdClick(ad.id)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 font-bold text-[12px] px-4 py-2 rounded-xl shadow-soft hover:brightness-110 active:scale-95 transition ${destinationKind === "whatsapp" ? "bg-[#25D366] text-white" : "bg-[#7A0C2E] text-white"}`}
                >
                  {destinationKind === "whatsapp" ? <WhatsAppIcon className="w-4 h-4" mono /> : null}
                  <span>{destinationLabel}</span>
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
