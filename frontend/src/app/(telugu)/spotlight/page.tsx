import type { Metadata } from "next";
import SpotlightPromotionPageClient from "./page-client";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import FaqBlock from "@/components/FaqBlock";
import { buildPageSeo } from "@/lib/page-seo";

export const metadata: Metadata = {
  title: "Sponsored Profile Placement",
  description: "Apply for a time-limited sponsored profile placement. Payment and profile/media review are required; identity verification, reach, responses, and matches are not guaranteed.",
  alternates: { canonical: "https://manavivaha.in/spotlight" },
};

const TRAIL: Crumb[] = [
  { en: "Home", te: "హోమ్", href: "/" },
  { en: "Sponsored Profiles", te: "స్పాన్సర్డ్ ప్రొఫైళ్లు", href: "/spotlight"  },
];

const SEO = buildPageSeo({ key: "spotlight", path: "/spotlight", trail: TRAIL, vars: {} });

export default function SpotlightPromotionPage() {
  return (
    <>
      {/* Structured data mirrors the questions rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.crumbJsonLd }} />
      <Breadcrumbs trail={TRAIL} />
      <SpotlightPromotionPageClient />
      <FaqBlock itemsEn={SEO.faqEn} itemsTe={SEO.faqTe} />
    </>
  );
}
