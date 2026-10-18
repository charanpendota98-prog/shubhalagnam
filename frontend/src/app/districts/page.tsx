import type { Metadata } from "next";
import DistrictsPageClient from "./page-client";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import FaqBlock from "@/components/FaqBlock";
import { buildPageSeo } from "@/lib/page-seo";
import { AP_DISTRICTS, TS_DISTRICTS } from "@/lib/telugu-data";

export const metadata: Metadata = {
  title: "District-wise Matrimony Directory",
  description: "Browse member-submitted matrimony profiles by district across Telangana and Andhra Pradesh.",
  alternates: { canonical: "https://manavivaha.in/districts" },
};

const TRAIL: Crumb[] = [
  { en: "Home", te: "హోమ్", href: "/" },
  { en: "Districts", te: "జిల్లాలు", href: "/districts"  },
];

const SEO = buildPageSeo({ key: "districts", path: "/districts", trail: TRAIL, vars: { districtCount: TS_DISTRICTS.length + AP_DISTRICTS.length } });

export default function DistrictsPage() {
  return (
    <>
      {/* Structured data mirrors the questions rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.crumbJsonLd }} />
      <Breadcrumbs trail={TRAIL} />
      <DistrictsPageClient />
      <FaqBlock itemsEn={SEO.faqEn} itemsTe={SEO.faqTe} />
    </>
  );
}
