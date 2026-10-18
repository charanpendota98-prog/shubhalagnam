/**
 * FAQ copy for community landing pages (/castes/<community>-<role>-<district>).
 *
 * Every answer here restates rules that already exist elsewhere on the site —
 * pricing, contact timing, verification limits. Nothing is invented: a count is
 * only emitted when the caller supplies one, and no answer promises an outcome.
 *
 * Pure and dependency-free so it can be unit-tested and reused by the schema
 * builder and the visible FAQ block. The rules that other pages also quote
 * come from faq-facts.mjs so the wording cannot drift between pages.
 */

import { fact } from "./faq-facts.mjs";

const OFFICIAL_EN = "No. Mana Vivaha is an independent listing platform, not an official {community} organisation or community body. Community Telegram/WhatsApp groups are optional and a link appears only when an admin or the group owner has added one.";
const OFFICIAL_TE = "కాదు. మన వివాహ ఒక స్వతంత్ర లిస్టింగ్ వేదిక; ఇది అధికారిక {community} సంస్థ కాదు. కమ్యూనిటీ Telegram/WhatsApp గ్రూపులు ఐచ్ఛికం — admin లేదా group owner లింక్ ఇచ్చినప్పుడు మాత్రమే అది కనిపిస్తుంది.";

const SEARCH_EN = "Yes. Open search and filter by community{district} — saved searches can alert you when new matches appear, and shortlists are private to your account.";
const SEARCH_TE = "అవును. Search లో community{district} ఫిల్టర్ వాడండి — saved searches ద్వారా కొత్త matches వచ్చినప్పుడు అలర్ట్ పొందవచ్చు, shortlists మీ ఖాతాలోనే ప్రైవేట్ గా ఉంటాయి.";

const PUBLISH_EN = "After profile approval, a post may be queued for relevant destinations such as the {community} {role} community if publishing is configured and has channel access. Delivery is not guaranteed, and availability is not checked automatically.";
const PUBLISH_TE = "Profile ఆమోదం తర్వాత, publishing configured అయి channel access ఉంటే {community} {role} వంటి సంబంధిత destinations కు post queue కావచ్చు. Delivery హామీ కాదు; availability ఆటోమేటిక్‌గా check చేయబడదు.";

const PORUTHAM_EN = "The /porutham workspace accepts an owner-uploaded horoscope document and shows only its evidence-review state. It does not generate a star-only Gunamelanam score, complete chart, or marriage verdict; review the original document with a qualified astrologer.";
const PORUTHAM_TE = "/porutham workspace లో owner-upload చేసిన జాతక పత్రం యొక్క evidence-review స్థితి మాత్రమే కనిపిస్తుంది. కేవలం నక్షత్రాల నుంచి Gunamelanam score, పూర్తి chart లేదా వివాహ తీర్పు తయారు చేయము; అసలైన పత్రాన్ని qualified astrologer తో పరిశీలించండి.";

const COUNT_EN = "{count} {role} profiles currently list {community} as their community. The number changes as members join, deactivate, or are removed.";
const COUNT_TE = "ప్రస్తుతం {count} {role} ప్రొఫైళ్లు {community} ను తమ కమ్యూనిటీగా పేర్కొన్నాయి. సభ్యులు చేరడం, ఖాతా నిలిపివేయడం లేదా తొలగింపు వల్ల ఈ సంఖ్య మారుతుంది.";

/** @param {unknown} value */
function text(value) {
  return String(value ?? "").trim();
}

/**
 * Build the visible + structured FAQ for a community landing page.
 *
 * @param {{
 *   community?: string, role?: string, district?: string,
 *   count?: number|null, te?: boolean,
 * }} [options]
 * @returns {{ id: string, q: string, a: string }[]}
 */
export function communityFaq(options = {}) {
  const community = text(options.community) || "this community";
  const role = text(options.role).toLowerCase() || "member";
  const district = text(options.district);
  const te = Boolean(options.te);
  const where = district ? ` and ${district}` : "";
  const count = Number.isFinite(Number(options.count)) && Number(options.count) >= 0
    ? Math.floor(Number(options.count))
    : null;

  const fill = (template, extra = {}) =>
    template.replace(/\{(\w+)\}/g, (_, key) => (key in extra ? String(extra[key]) : community));

  const items = [];
  if (count !== null) {
    items.push({
      id: "count",
      q: te
        ? `ఇక్కడ ఎన్ని ${community} ${role} ప్రొఫైళ్లు ఉన్నాయి?`
        : `How many ${community} ${role} profiles are listed here?`,
      a: fill(te ? COUNT_TE : COUNT_EN, { count, role, community }),
    });
  }
  items.push(
    {
      id: "verification",
      q: te ? `${community} ప్రొఫైళ్లు ధృవీకరించబడ్డాయా?` : `Are the ${community} profiles verified?`,
      a: fact("notVerified", te),
    },
    {
      id: "contact",
      q: te ? "Contact details ఎప్పుడు వస్తాయి?" : "When do I get contact details?",
      a: fact("contact", te),
    },
    {
      id: "cost",
      q: te ? "ఖర్చు ఎంత? Free లో ఏమి వస్తుంది?" : "How much does it cost, and what is free?",
      a: fact("cost", te),
    },
    {
      id: "official",
      q: te
        ? `ఇది అధికారిక ${community} సంస్థనా?`
        : `Is this an official ${community} organisation?`,
      a: fill(te ? OFFICIAL_TE : OFFICIAL_EN),
    },
    {
      id: "guarantee",
      q: te ? "పెళ్లి ఖాయమా? మీరు సంబంధాలు కుదురుస్తారా?" : "Do you arrange or guarantee marriages?",
      a: fact("guarantee", te),
    },
    {
      id: "search",
      q: te
        ? `${community} ప్రొఫైళ్లను${district ? ` ${district} లో` : ""} ఎలా వెతకాలి?`
        : `How do I search ${community} profiles${district ? ` in ${district}` : ""}?`,
      a: fill(te ? SEARCH_TE : SEARCH_EN, { district: where }),
    },
    {
      id: "chat",
      q: te ? "ఈ సైట్‌లో chatting ఉందా?" : "Is there in-site chatting?",
      a: fact("noChat", te),
    },
    {
      id: "publish",
      q: te ? "నా profile ఎక్కడ post అవుతుంది?" : "Where does my profile get posted?",
      a: fill(te ? PUBLISH_TE : PUBLISH_EN, { role: `${role}s` }),
    },
    {
      id: "porutham",
      q: te
        ? `${community} వేద గుణమేళనం / జాతక పొంతన ఉందా?`
        : `Is there a ${community} Vedic Gunamelanam check?`,
      a: te ? PORUTHAM_TE : PORUTHAM_EN,
    },
  );
  return items;
}

/**
 * FAQPage structured data. Only questions that are rendered on the page belong
 * here — anything invisible to the reader must not be in the schema.
 *
 * @param {{ id: string, q: string, a: string }[]} items
 */
export function communityFaqSchema(items) {
  const rows = Array.isArray(items) ? items : [];
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: rows
      .filter((row) => row && text(row.q) && text(row.a))
      .map((row) => ({
        "@type": "Question",
        name: text(row.q),
        acceptedAnswer: { "@type": "Answer", text: text(row.a) },
      })),
  };
}

/**
 * BreadcrumbList for a landing page.
 * @param {{ siteUrl?: string, path?: string, community?: string, role?: string, district?: string }} [options]
 */
export function communityBreadcrumb(options = {}) {
  const siteUrl = text(options.siteUrl).replace(/\/+$/, "") || "https://manavivaha.in";
  const path = text(options.path);
  const community = text(options.community);
  const role = text(options.role);
  const district = text(options.district);
  const crumbs = [{ name: "Home", url: `${siteUrl}/` }];
  if (community) crumbs.push({ name: "Communities", url: `${siteUrl}/castes` });
  const label = [community, role, district].filter(Boolean).join(" ");
  if (label) crumbs.push({ name: label, url: `${siteUrl}${path}` });
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
