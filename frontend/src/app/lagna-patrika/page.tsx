import LagnaPatrikaStudio from "@/components/LagnaPatrikaStudio";
import Breadcrumbs, { type Crumb } from "@/components/Breadcrumbs";
import FaqBlock from "@/components/FaqBlock";
import { buildPageSeo } from "@/lib/page-seo";

export const metadata = {
  title: "Lagna Patrika Studio — Telugu Wedding Invitation Maker",
  description: "Create a traditional Telugu Lagna Patrika wedding invitation using the details you provide, then download it to share with family and friends.",
  alternates: { canonical: "https://manavivaha.in/lagna-patrika" },
};

const TRAIL: Crumb[] = [
  { en: "Home", te: "హోమ్", href: "/" },
  { en: "Lagna Patrika Studio", te: "లగ్న పత్రిక", href: "/lagna-patrika"  },
];

const SEO = buildPageSeo({ key: "lagna_patrika", path: "/lagna-patrika", trail: TRAIL, vars: {} });

export default function LagnaPatrikaPage() {
  return (
    <>
      {/* Structured data mirrors the questions rendered below. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.faqJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SEO.crumbJsonLd }} />
      <Breadcrumbs trail={TRAIL} />
      <LagnaPatrikaStudio />
      <FaqBlock itemsEn={SEO.faqEn} itemsTe={SEO.faqTe} />
    </>
  );
}
