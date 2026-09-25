/**
 * SEO landing page — /castes/reddy-bride-hyderabad
 * =================================================
 * Shell stays server (generateMetadata SSR — fast + crawlable); body is client with te/en toggle.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseSlug, channelForCaste } from "@/lib/seo-pages";
import { SITE_CONFIG } from "@/lib/site-config";
import CasteClient from "./caste-client";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) return { title: "Caste Matrimony Channels" };
  const { caste, role, district } = parsed;
  const chan = channelForCaste(caste.key, role);
  const where = district ? `${district.name} (${district.state})` : "Telangana & Andhra Pradesh";
  const title = `${caste.name} ${role === "bride" ? "Bride" : "Groom"} ${district ? district.name : "TS/AP"} Matrimony`;
  return {
    title,
    description: `${caste.name} ${role} profiles ${where} — మన వివాహ (Manavivaha). ${caste.name} ${role === "bride" ? "brides" : "grooms"} Telegram channel లో verified profiles, WhatsApp లో interest పంపండి, ₹99 → 5 profiles. మొదటి 3 requests FREE. Chatting లేదు — consent based contact.`,
    keywords: [
      `${caste.name.toLowerCase()} matrimony`, `${caste.name.toLowerCase()} bride ${district?.name || "hyderabad"}`,
      `${caste.name.toLowerCase()} groom`, `${caste.name.toLowerCase()} sambandham`,
      `telugu matrimony ${district?.name || "telangana"}`, "Telugu matrimony", "manavivaha",
    ],
    alternates: { canonical: `${SITE_CONFIG.siteUrl}/castes/${slug}` },
  };
}

export default async function CasteLandingPage({ params }: Params) {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) notFound();
  const { caste, role, district } = parsed;
  const chan = channelForCaste(caste.key, role);
  const otherRole = role === "bride" ? "groom" : "bride";
  const otherChan = channelForCaste(caste.key, otherRole);
  return (
    <CasteClient
      caste={caste}
      role={role}
      district={district ? { slug: district.slug, name: district.name, state: district.state } : null}
      chan={chan ? {
        key: chan.key, name: chan.name, username: chan.username, link: chan.link, deepLink: chan.deepLink,
        desc: chan.desc, live: chan.live, wave: chan.wave, hashtags: chan.hashtags,
      } : null}
      otherChan={otherChan ? {
        key: otherChan.key, name: otherChan.name, username: otherChan.username,
        link: otherChan.link, live: otherChan.live,
      } : null}
    />
  );
}
