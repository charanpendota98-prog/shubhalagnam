import type { Metadata } from "next";
import BiodataStudio from "./biodata-client";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import FaqBlock from "@/components/FaqBlock";
import { buildPageSeo } from "@/lib/page-seo";

export const metadata: Metadata = {
  title: "Free Telugu marriage biodata maker",
  description:
    "Create a printable Telugu marriage biodata from the details you enter. Nothing is stored or published, and no profile is created or matched by using this tool.",
  alternates: { canonical: "https://manavivaha.in/biodata" },
};

const TRAIL: Crumb[] = [
  { en: "Home", te: "హోమ్", href: "/" },
  { en: "Biodata Maker", te: "బయోడేటా", href: "/biodata"  },
];

const SEO = buildPageSeo({ key: "biodata", path: "/biodata", trail: TRAIL, vars: {} });

export default function BiodataPage() {
  return (
    <>
      {/* Structured data mirrors the questions rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.crumbJsonLd }} />
      <Breadcrumbs trail={TRAIL} />
      <BiodataStudio />
      <FaqBlock itemsEn={SEO.faqEn} itemsTe={SEO.faqTe} />
    </>
  );
}
