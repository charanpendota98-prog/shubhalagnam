import type { Metadata } from "next";
import PoruthamPageClient from "./page-client";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import FaqBlock from "@/components/FaqBlock";
import { buildPageSeo } from "@/lib/page-seo";

export const metadata: Metadata = {
  title: "Vedic Porutham Reference",
  description: "Explore a traditional Porutham reference based on the birth details provided. It is informational and is not a relationship or marriage verdict.",
  alternates: { canonical: "https://manavivaha.in/porutham" },
};

const TRAIL: Crumb[] = [
  { en: "Home", te: "హోమ్", href: "/" },
  { en: "Porutham", te: "పొంతన", href: "/porutham"  },
];

const SEO = buildPageSeo({ key: "porutham", path: "/porutham", trail: TRAIL, vars: {} });

export default function PoruthamPage() {
  return (
    <>
      {/* Structured data mirrors the questions rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.crumbJsonLd }} />
      <Breadcrumbs trail={TRAIL} />
      <PoruthamPageClient />
      <FaqBlock itemsEn={SEO.faqEn} itemsTe={SEO.faqTe} />
    </>
  );
}
