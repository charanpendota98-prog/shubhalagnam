import { Metadata } from "next";
import PelliChoopuluGuide from "@/components/PelliChoopuluGuide";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import FaqBlock from "@/components/FaqBlock";
import { buildPageSeo } from "@/lib/page-seo";

export const metadata: Metadata = {
  title: "Pelli Choopulu: A Family Introduction Guide",
  description:
    "A practical guide to Telugu Pelli Choopulu customs, family etiquette, questions, and safety considerations.",
  alternates: { canonical: "https://manavivaha.in/pelli-choopulu" },
};

const TRAIL: Crumb[] = [
  { en: "Home", te: "హోమ్", href: "/" },
  { en: "Pelli Choopulu Guide", te: "పెళ్లి చూపులు", href: "/pelli-choopulu"  },
];

const SEO = buildPageSeo({ key: "pelli_choopulu", path: "/pelli-choopulu", trail: TRAIL, vars: {} });

export default function PelliChoopuluPage() {
  return (
    <>
      {/* Structured data mirrors the questions rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.crumbJsonLd }} />
      <Breadcrumbs trail={TRAIL} />
      <PelliChoopuluGuide />
      <FaqBlock itemsEn={SEO.faqEn} itemsTe={SEO.faqTe} />
    </>
  );
}
