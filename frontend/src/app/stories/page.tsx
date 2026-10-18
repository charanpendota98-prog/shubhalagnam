import type { Metadata } from "next";
import StoriesClient from "./stories-client";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import FaqBlock from "@/components/FaqBlock";
import CinematicGallery from "@/components/CinematicGallery";
import { buildPageSeo } from "@/lib/page-seo";

export const metadata: Metadata = {
  title: "Member Stories",
  description:
    "Members may submit a story about their Mana Vivaha experience. Stories appear after review when available. Registration includes three free interest requests; paid plans start at ₹99.",
  alternates: { canonical: "https://manavivaha.in/stories" },
};

const TRAIL: Crumb[] = [
  { en: "Home", te: "హోమ్", href: "/" },
  { en: "Member Stories", te: "సభ్యుల కథలు", href: "/stories"  },
];

const SEO = buildPageSeo({ key: "stories", path: "/stories", trail: TRAIL, vars: {} });

export default function StoriesPage() {
  return (
    <>
      {/* Structured data mirrors the questions rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.crumbJsonLd }} />
      <Breadcrumbs trail={TRAIL} />
      <StoriesClient />
      <CinematicGallery />
      <FaqBlock itemsEn={SEO.faqEn} itemsTe={SEO.faqTe} />
    </>
  );
}
