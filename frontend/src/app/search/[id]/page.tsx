import type { Metadata } from "next";
import { headers } from "next/headers";
import { CHANNEL_STATS } from "@/lib/channels";
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
    const d = await r.json();
    return (d && (d.profile || d)) as Record<string, any> | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = String(rawId || "").toUpperCase();
  const p = await fetchProfile(id);
  const name = p?.full_name ? String(p.full_name) : "Telugu Matrimony Profile";
  const bits = [p?.age ? `${p.age} yrs` : "", p?.caste, p?.education, p?.job, p?.district].filter(Boolean).join(" • ");
  const title = `${name} (${id}) — ${bits || "Profile"} | మన వివాహ`;
  const description = p
    ? `${bits}. Porutham, family, horoscope details + interest పంపండి. మన వివాహ — Telugu matrimony (TS + AP), ${CHANNEL_STATS.total} channels, 3 FREE requests.`
    : `మన వివాహ — Telugu matrimony. TS + AP, 43 castes, ${CHANNEL_STATS.total} channels, 3 FREE requests. Register FREE.`;
  const base = await siteBase();
  const ogImage = `${base}/api/og/profile/${encodeURIComponent(id)}.png`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${base}/search/${encodeURIComponent(id)}` },
    openGraph: {
      title,
      description,
      url: `${base}/search/${encodeURIComponent(id)}`,
      siteName: "మన వివాహ",
      type: "profile",
      locale: "te_IN",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    other: { "profile:tsap_id": id, ...(p?.caste ? { "profile:caste": String(p.caste) } : {}) },
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
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            identifier: safeId,
            url: `${base}/search/${encodeURIComponent(safeId)}`,
            name: "మన వివాహ verified profile",
            description: "Telugu matrimony profile — మన వివాహ (TS + AP)",
            isPartOf: { "@type": "WebSite", name: "మన వివాహ", url: base },
          }),
        }}
      />
      <ProfileView />
    </>
  );
}
