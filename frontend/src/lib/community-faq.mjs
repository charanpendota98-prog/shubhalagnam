/**
 * FAQ copy for community landing pages (/castes/<community>-<role>-<district>).
 *
 * Every answer here restates rules that already exist elsewhere on the site —
 * pricing, contact timing, verification limits. Nothing is invented: a count is
 * only emitted when the caller supplies one, and no answer promises an outcome.
 *
 * Pure and dependency-free so it can be unit-tested and reused by the schema
 * builder and the visible FAQ block.
 */

const NOT_VERIFIED_EN = "Profile details are member-submitted and are not independently verified. A phone OTP, where it is used, only checks access to that phone — it does not verify a person's identity, caste, income or intent. Review details yourself and use the Report button on a profile.";
const NOT_VERIFIED_TE = "ప్రొఫైల్ వివరాలు సభ్యులు అందించినవి; స్వతంత్రంగా ధృవీకరించబడవు. ఎక్కడైనా phone OTP ఉంటే అది ఆ ఫోన్ యాక్సెస్‌ను మాత్రమే చూస్తుంది — వ్యక్తి గుర్తింపు, కులం, ఆదాయం లేదా ఉద్దేశాన్ని నిర్ధారించదు. వివరాలను మీరే పరిశీలించి, profile లోని Report బటన్ వాడండి.";

const CONTACT_EN = "Phone numbers are never shown publicly or in search results. After you send an interest request and the profile owner accepts it, contact details appear in your accepted-request account views. A configured WhatsApp notification is not guaranteed to be delivered.";
const CONTACT_TE = "ఫోన్ నంబర్లు public గా గానీ search లో గానీ కనిపించవు. మీరు interest పంపి, profile owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి. WhatsApp notification delivery హామీ లేదు.";

const COST_EN = "Registration is free and includes the first 3 interest requests. Paid plans start at ₹99 for 5 interest requests with 30-day credit validity. One credit is used per request; add-ons are priced separately.";
const COST_TE = "నమోదు ఉచితం, మొదటి 3 interest requests ఉచితం. ₹99 ప్లాన్‌లో 5 interest requests, 30 రోజుల credit validity ఉంటాయి. ఒక request కు ఒక credit; add-ons ధరలు విడిగా ఉంటాయి.";

const OFFICIAL_EN = "No. Mana Vivaha is an independent listing platform, not an official {community} organisation or community body. Community Telegram/WhatsApp groups are optional and a link appears only when an admin or the group owner has added one.";
const OFFICIAL_TE = "కాదు. మన వివాహ ఒక స్వతంత్ర లిస్టింగ్ వేదిక; ఇది అధికారిక {community} సంస్థ కాదు. కమ్యూనిటీ Telegram/WhatsApp గ్రూపులు ఐచ్ఛికం — admin లేదా group owner లింక్ ఇచ్చినప్పుడు మాత్రమే అది కనిపిస్తుంది.";

const GUARANTEE_EN = "No. This is an introduction platform: you review member-submitted details and send interest. Marriages are arranged by families, not by the site, and no match, score or listing guarantees an outcome.";
const GUARANTEE_TE = "కాదు. ఇది పరిచయ వేదిక: సభ్యులు అందించిన వివరాలు చూసి మీరు interest పంపుతారు. వివాహాలు కుటుంబాలు నిర్ణయిస్తాయి, సైట్ కాదు; ఏ match, score లేదా listing ఫలితానికి హామీ కాదు.";

const SEARCH_EN = "Yes. Open search and filter by community{district} — saved searches can alert you when new matches appear, and shortlists are private to your account.";
const SEARCH_TE = "అవును. Search లో community{district} ఫిల్టర్ వాడండి — saved searches ద్వారా కొత్త matches వచ్చినప్పుడు అలర్ట్ పొందవచ్చు, shortlists మీ ఖాతాలోనే ప్రైవేట్ గా ఉంటాయి.";

const CHAT_EN = "There is no in-site chat. Interest notification delivery is not guaranteed. Owner acceptance grants contact access in accepted-request account views; decline credit returns follow account policy.";
const CHAT_TE = "ఈ సైట్‌లో chatting లేదు. Interest notification delivery హామీ లేదు. Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి; decline అయితే credit return account policy ప్రకారం ఉంటుంది.";

const PUBLISH_EN = "After profile approval, a post may be queued for relevant destinations such as the {community} {role} community if publishing is configured and has channel access. Delivery is not guaranteed, and availability is not checked automatically.";
const PUBLISH_TE = "Profile ఆమోదం తర్వాత, publishing configured అయి channel access ఉంటే {community} {role} వంటి సంబంధిత destinations కు post queue కావచ్చు. Delivery హామీ కాదు; availability ఆటోమేటిక్‌గా check చేయబడదు.";

const PORUTHAM_EN = "Yes — the Vedic Gunamelanam report (rasi, nakshatra, gana, yoni, rajju, vedha…) is free to view at /porutham. It is informational: it does not verify a person and does not decide or guarantee a marriage.";
const PORUTHAM_TE = "అవును — వేద గుణమేళనం రిపోర్ట్ (రాశి, నక్షత్రం, గణ, యోని, రజ్జు, వేధ…) ఉచితంగా /porutham లో చూడొచ్చు. ఇది సమాచారం కోసమే: వ్యక్తిని ధృవీకరించదు, వివాహ నిర్ణయం లేదా ఫలితానికి హామీ కాదు.";

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
      a: te ? NOT_VERIFIED_TE : NOT_VERIFIED_EN,
    },
    {
      id: "contact",
      q: te ? "Contact details ఎప్పుడు వస్తాయి?" : "When do I get contact details?",
      a: te ? CONTACT_TE : CONTACT_EN,
    },
    {
      id: "cost",
      q: te ? "ఖర్చు ఎంత? Free లో ఏమి వస్తుంది?" : "How much does it cost, and what is free?",
      a: te ? COST_TE : COST_EN,
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
      a: te ? GUARANTEE_TE : GUARANTEE_EN,
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
      a: te ? CHAT_TE : CHAT_EN,
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
