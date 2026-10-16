/**
 * SEO landing page — /castes/reddy-bride-hyderabad
 * =================================================
 * Shell stays server (generateMetadata SSR — fast + crawlable); body is client with te/en toggle.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { parseSlug, channelForCaste } from "@/lib/seo-pages";
import { SITE_CONFIG } from "@/lib/site-config";
import { serializeJsonLd } from "@/lib/safe-json-ld";
import { communityBreadcrumb, communityFaq, communityFaqSchema } from "@/lib/community-faq.mjs";
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
    description: `${caste.name} ${role} profiles ${where} — మన వివాహ (Manavivaha). Member-submitted listings, consent-based contact options, ₹99 → 5 profiles; first 3 requests are free. Profile details are not independently verified.`,
    keywords: [
      `${caste.name.toLowerCase()} matrimony`, `${caste.name.toLowerCase()} bride ${district?.name || "hyderabad"}`,
      `${caste.name.toLowerCase()} groom`, `${caste.name.toLowerCase()} sambandham`,
      `telugu matrimony ${district?.name || "telangana"}`, "Telugu matrimony", "manavivaha",
    ],
    alternates: { canonical: `${SITE_CONFIG.siteUrl}/castes/${slug}` },
    openGraph: {
      type: "website",
      url: `${SITE_CONFIG.siteUrl}/castes/${slug}`,
      siteName: "Mana Vivaha (మన వివాహ)",
      title,
      description: `${caste.name} ${role} profiles ${where} — member-submitted listings, consent-based contact options, first 3 interest requests free. Profile details are not independently verified.`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: `${caste.name} ${role} profiles ${where} — member-submitted listings on Mana Vivaha. Details are not independently verified.`,
    },
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
  const path = `/castes/${slug}`;
  const faqEn = communityFaq({ community: caste.name, role, district: district?.name });
  const faqTe = communityFaq({ community: caste.name, role, district: district?.name, te: true });
  return (
    <>
      {/* Structured data mirrors exactly what the page renders — no hidden FAQ. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(communityFaqSchema(faqEn)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(communityBreadcrumb({
            siteUrl: SITE_CONFIG.siteUrl, path,
            community: caste.name, role, district: district?.name,
          })),
        }}
      />
      <CasteClient
      caste={caste}
      role={role}
      district={district ? { slug: district.slug, name: district.name, state: district.state } : null}
      chan={chan ? {
        key: chan.key, name: chan.name,
        desc: chan.desc, routingEligible: chan.routingEligible, wave: chan.wave, hashtags: chan.hashtags,
      } : null}
      otherChan={otherChan ? {
        key: otherChan.key, name: otherChan.name,
      } : null}
      faqEn={faqEn}
      faqTe={faqTe}
      />
    </>
  );
}
