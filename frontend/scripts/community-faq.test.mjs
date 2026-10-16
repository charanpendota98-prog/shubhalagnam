/**
 * FAQ copy + structured data for community landing pages.
 */
import { readFileSync } from "node:fs";

import { communityFaq, communityFaqSchema, communityBreadcrumb } from "../src/lib/community-faq.mjs";

let pass = 0;
let fail = 0;

function check(label, condition) {
  if (condition) {
    pass += 1;
  } else {
    fail += 1;
    console.log(`  FAIL  ${label}`);
  }
}

function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  check(`${label} (got ${a}, want ${b})`, a === b);
}

const BASE = { community: "Reddy", role: "bride", district: "Hyderabad" };

// ---------------------------------------------------------------- shape

const en = communityFaq(BASE);
check("English FAQ built", en.length >= 6);
check("every item has q and a", en.every((row) => row.q.trim() && row.a.trim()));
check("every item has a stable id", new Set(en.map((row) => row.id)).size === en.length);
check("no placeholder braces survive", !en.some((row) => /\{\w+\}/.test(row.q + row.a)));

const te = communityFaq({ ...BASE, te: true });
eq("both languages produce the same ids", te.map((r) => r.id), en.map((r) => r.id));
check("Telugu answers are actually Telugu", te.some((row) => /[ఀ-౿]/.test(row.a)));
check("English answers are not Telugu", !en.some((row) => /[ఀ-౿]/.test(row.a)));

// ---------------------------------------------------------------- honesty

const joinedEn = en.map((row) => row.a).join(" ");
check("says profiles are not verified", /not independently verified/i.test(joinedEn));
check("never claims verification", !/\bverified profiles\b/i.test(joinedEn));
check("states registration is free with 3 requests", /free/i.test(joinedEn) && /3 interest requests/.test(joinedEn));
check("states the ₹99 / 5 requests plan", /₹99/.test(joinedEn) && /5 interest requests/.test(joinedEn));
check("contact details follow acceptance", /accept/i.test(joinedEn));
check("WhatsApp delivery is not guaranteed", /not guaranteed/i.test(joinedEn));
check("denies being an official body", /not an official|independent listing platform/i.test(joinedEn));
check("denies arranging or guaranteeing marriages", /no match, score or listing guarantees/i.test(joinedEn));
check("no invented compatibility score", !/\d{1,3}%/.test(joinedEn));

const joinedTe = te.map((row) => row.a).join(" ");
check("Telugu copy keeps the same limits", /హామీ లేదు/.test(joinedTe) && /ధృవీకరించబడవు/.test(joinedTe));

// ---------------------------------------------------------------- counts

check("no count question without a count", !en.some((row) => row.id === "count"));
const zero = communityFaq({ ...BASE, count: 0 });
check("count 0 is still shown honestly", zero.some((row) => row.id === "count" && /0 bride profiles/.test(row.a)));
const seven = communityFaq({ ...BASE, count: 7.6 });
check("fractional counts are floored", seven.some((row) => row.id === "count" && /7 bride profiles/.test(row.a)));
check("bad counts are ignored", !communityFaq({ ...BASE, count: "many" }).some((row) => row.id === "count"));
check("negative counts are ignored", !communityFaq({ ...BASE, count: -3 }).some((row) => row.id === "count"));

// ---------------------------------------------------------------- fallbacks

const bare = communityFaq();
check("works with no arguments", bare.length >= 6);
check("falls back to a readable community", bare.every((row) => !/\{/.test(row.q + row.a)));
check("falls back to member role", bare.length === bare.filter((row) => !/undefined/.test(row.a)).length);
const noDistrict = communityFaq({ community: "Kamma", role: "groom" });
check("district-free page omits the district clause", !noDistrict.some((row) => /in $/.test(row.q)));
check("district page mentions the district", en.some((row) => /Hyderabad/.test(row.q)));

// ---------------------------------------------------------------- schema

const schema = communityFaqSchema(en);
eq("schema type", schema["@type"], "FAQPage");
eq("schema carries every question", schema.mainEntity.length, en.length);
check("schema questions have answers", schema.mainEntity.every((row) => row.acceptedAnswer.text.length > 20));
eq("empty input yields empty schema", communityFaqSchema([]).mainEntity, []);
eq("garbage input yields empty schema", communityFaqSchema("nope").mainEntity, []);
check("blank rows are dropped", communityFaqSchema([{ q: "", a: "" }, en[0]]).mainEntity.length === 1);

const crumbs = communityBreadcrumb({ siteUrl: "https://manavivaha.in/", path: "/castes/reddy-bride-hyderabad", ...BASE });
eq("breadcrumb type", crumbs["@type"], "BreadcrumbList");
eq("breadcrumb has home, index and page", crumbs.itemListElement.length, 3);
eq("positions are 1-based in order", crumbs.itemListElement.map((c) => c.position), [1, 2, 3]);
check("last crumb is the page itself", crumbs.itemListElement[2].item.endsWith("/castes/reddy-bride-hyderabad"));
check("no double slashes from the site url", !Object.values(crumbs.itemListElement).some((c) => /[^:]\/\//.test(c.item)));
eq("bare breadcrumb is just home", communityBreadcrumb().itemListElement.length, 1);

// ---------------------------------------------------------------- wiring

const page = readFileSync(new URL("../src/app/castes/[slug]/page.tsx", import.meta.url), "utf8");
check("landing page builds the FAQ", /communityFaq\(/.test(page));
check("landing page emits FAQ schema", /communityFaqSchema\(/.test(page));
check("landing page emits breadcrumbs", /communityBreadcrumb\(/.test(page));
check("landing page serialises JSON-LD safely", /serializeJsonLd/.test(page));

console.log(`community-faq: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
