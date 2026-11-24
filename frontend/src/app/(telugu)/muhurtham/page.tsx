import type { Metadata } from "next";
import MuhurthamPageClient from "./page-client";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import FaqBlock from "@/components/FaqBlock";
import { buildPageSeo } from "@/lib/page-seo";

export const metadata: Metadata = {
  title: "Wedding Muhurtham Dates & Times",
  description: "Browse indicative wedding muhurtham dates and times. Confirm the details with a local practitioner before making arrangements.",
  alternates: { canonical: "https://manavivaha.in/muhurtham" },
};

const TRAIL: Crumb[] = [
  { en: "Home", te: "హోమ్", href: "/" },
  { en: "Muhurtham Dates", te: "ముహూర్త తేదీలు", href: "/muhurtham"  },
];

const SEO = buildPageSeo({ key: "muhurtham", path: "/muhurtham", trail: TRAIL, vars: {} });

export default function MuhurthamPage() {
  return (
    <>
      {/* Structured data mirrors the questions rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.crumbJsonLd }} />
      <Breadcrumbs trail={TRAIL} />
      <MuhurthamPageClient />
      <FaqBlock itemsEn={SEO.faqEn} itemsTe={SEO.faqTe} />
    </>
  );
}
