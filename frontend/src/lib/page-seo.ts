/**
 * One call that gives a landing page its FAQ copy, its visible trail data and
 * the two JSON-LD blocks that match them.
 *
 * The schema is always built from the English set (crawlers), while the reader
 * gets whichever language the toggle is on — the ids are identical, so the two
 * can never describe different questions.
 */

import { serializeJsonLd } from "./safe-json-ld";
import { pageBreadcrumb, pageFaq, pageFaqSchema } from "./page-faq.mjs";

export type FaqItem = { id: string; q: string; a: string };
export type Crumb = { en: string; te?: string; href?: string };

export type PageSeo = {
  faqEn: FaqItem[];
  faqTe: FaqItem[];
  faqJsonLd: string;
  crumbJsonLd: string;
};

export function buildPageSeo({
  key,
  path,
  trail,
  vars = {},
  siteUrl = "https://manavivaha.in",
}: {
  key: string;
  path: string;
  trail: Crumb[];
  vars?: Record<string, string | number>;
  siteUrl?: string;
}): PageSeo {
  const faqEn = pageFaq(key, { te: false, vars }) as FaqItem[];
  const faqTe = pageFaq(key, { te: true, vars }) as FaqItem[];
  return {
    faqEn,
    faqTe,
    faqJsonLd: serializeJsonLd(pageFaqSchema(faqEn)),
    crumbJsonLd: serializeJsonLd(pageBreadcrumb({ siteUrl, path, trail })),
  };
}
