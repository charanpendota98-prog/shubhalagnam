import type { Metadata } from "next";
import SecondMarriagePageClient from "./page-client";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import FaqBlock from "@/components/FaqBlock";
import { buildPageSeo } from "@/lib/page-seo";

export const metadata: Metadata = {
  title: "Second Marriage & Remarriage Profiles",
  description: "Browse member-submitted profiles for adults considering remarriage. Availability varies, profile details are not independently verified, and outcomes are not guaranteed.",
  alternates: { canonical: "https://manavivaha.in/second-marriage" },
};

const TRAIL: Crumb[] = [
  { en: "Home", te: "హోమ్", href: "/" },
  { en: "Second Marriage", te: "రెండో వివాహం", href: "/second-marriage"  },
];

const SEO = buildPageSeo({ key: "second_marriage", path: "/second-marriage", trail: TRAIL, vars: {} });

export default function SecondMarriagePage() {
  return (
    <>
      {/* Structured data mirrors the questions rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.crumbJsonLd }} />
      <Breadcrumbs trail={TRAIL} />
      <SecondMarriagePageClient />
      <FaqBlock itemsEn={SEO.faqEn} itemsTe={SEO.faqTe} />
    </>
  );
}
