import { apiDisplayMessage, readApiJson } from "@/lib/api";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { CHANNEL_STATS } from "@/lib/channels";
import { serializeJsonLd } from "@/lib/safe-json-ld";
import ProfileView from "./ProfileView";

/**
 * 🖼️ /search/[id] — SERVER wrapper (SEO + WhatsApp/Telegram OG preview)
 * ====================================================================
 * Mundu ee page "use client" matrame — anduke per-profile title/description/OG image
 * pettalem (WhatsApp lo link pampinappudu photo preview rakunde). Ippudu:
 *   • generateMetadata → per-profile title, description, og:image (backend Pillow tho generate ayyedi)
 *   • <ProfileView />   → asalu advanced client UI (filters, interest, number reveal…)
 * Backend fail aithe safe fallback (site eppudu kanipistundi).
 */
const SITE = (process.env.SITE_URL || "https://manavivaha.in").replace(/\/$/, "");
const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

/**
 * 🌐 Request host ni batti absolute URL (staging / preview / prod — anni chotla OG pani cheyyali).
 * SITE_URL set unte adi ne vadutham (production lo manavivaha.in).
 */
async function siteBase(): Promise<string> {
  if (process.env.SITE_URL) return SITE;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || "https";
    if (host) return `${proto}://${host}`;
  } catch { /* static build lo skip */ }
  return SITE;
}

async function fetchProfile(id: string) {
  try {
    const r = await fetch(`${BACKEND}/api/search/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!r.ok) return null;
    const d = await readApiJson(r);
    return (d && (d.profile || d)) as Record<string, any> | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = String(rawId || "").toUpperCase();
  const p = await fetchProfile(id);
  const name = p?.full_name ? String(p.full_name).trim() : "Telugu Matrimony Profile";
  const englishTerm = (value: unknown) => apiDisplayMessage({ message_en: String(value ?? "") }, false, "");
  const bits = [
    p?.age ? `${p.age} years` : "",
    englishTerm(p?.caste),
    englishTerm(p?.education),
    englishTerm(p?.job),
    englishTerm(p?.district),
  ].filter(Boolean).join(" • ");
  const title = `${name} (${id})${bits ? ` — ${bits}` : " — Member Profile"} | Mana Vivaha (మన వివాహ)`;
  const description = p
    ? `${bits ? `${bits}. ` : ""}Member-submitted profile on Mana Vivaha. Profile details are not independently verified. Contact details are available in account views only after the profile owner accepts an interest request.`
    : `Member profiles on Mana Vivaha across Telangana and Andhra Pradesh. Profile details are not independently verified; contact sharing follows profile-owner acceptance.`;
  const base = await siteBase();
  const ogImage = `${base}/api/og/profile/${encodeURIComponent(id)}.png`;
  const caste = englishTerm(p?.caste);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${base}/search/${encodeURIComponent(id)}` },
    openGraph: {
      title,
      description,
      url: `${base}/search/${encodeURIComponent(id)}`,
      siteName: "Mana Vivaha (మన వివాహ)",
      type: "profile",
      locale: "en_IN",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    robots: { index: false, follow: false },
    other: { "profile:tsap_id": id, ...(caste ? { "profile:caste": caste } : {}) },
  };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const base = await siteBase();
  const { id: rawId } = await params;
  // 🌊 WAVE 23 — SECURITY: JSON-LD script-breakout fix (</script> in URL id)
  const safeId = String(rawId || "").replace(/[<>"']/g, "").slice(0, 40);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd({
            "@context": "https://schema.org",
            "@type": "Person",
            identifier: safeId,
            url: `${base}/search/${encodeURIComponent(safeId)}`,
            name: "Mana Vivaha member profile (మన వివాహ)",
            description: "Member-submitted Telugu matrimony profile. Profile details are not independently verified; contact sharing follows profile-owner acceptance.",
            isPartOf: { "@type": "WebSite", name: "Mana Vivaha (మన వివాహ)", url: base },
          }),
        }}
      />
      <ProfileView />
    </>
  );
}
