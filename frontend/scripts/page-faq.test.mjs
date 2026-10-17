/**
 * FAQ copy + structured data for the tool and guide pages.
 */
import { readFileSync } from "node:fs";

import { PAGE_FAQS, pageBreadcrumb, pageFaq, pageFaqKeys, pageFaqSchema } from "../src/lib/page-faq.mjs";
import { FAQ_FACTS, fact } from "../src/lib/faq-facts.mjs";

let pass = 0;
let fail = 0;

function check(label, condition) {
  if (condition) pass += 1;
  else {
    fail += 1;
    console.log(`  FAIL  ${label}`);
  }
}

function eq(label, actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  check(`${label} (got ${a}, want ${b})`, a === b);
}

const KEYS = pageFaqKeys();

// ---------------------------------------------------------------- shape

check("every page has a question set", KEYS.length >= 9);

for (const key of KEYS) {
  const set = PAGE_FAQS[key];
  const en = pageFaq(key);
  const te = pageFaq(key, { te: true });
  check(`${key}: English and Telugu sets align`, set.en.length === set.te.length && en.length === te.length);
  eq(`${key}: ids match across languages`, te.map((row) => row.id), en.map((row) => row.id));
  check(`${key}: ids are unique`, new Set(en.map((row) => row.id)).size === en.length);
  check(`${key}: every question has an answer`, en.every((row) => row.q.trim().length > 5 && row.a.trim().length > 20));
  check(`${key}: Telugu answers are Telugu`, te.every((row) => /[ఀ-౿]/.test(row.a)));
  check(`${key}: no unfilled placeholder`, !en.some((row) => /\{\w+\}/.test(row.q + row.a)));
  check(`${key}: at least four questions`, en.length >= 4);
}

// ---------------------------------------------------------------- honesty

/**
 * Words that would turn a limit into a promise. A percentage is fine when it
 * is being denied ("no 100% safety guarantee"), so the negation is checked.
 */
const BANNED = [/\bcertified\b/i, /\bfully verified\b/i, /\brisk[- ]free\b/i];
/** A percentage is only acceptable inside a sentence that denies it. */
const PERCENT = /(?<![\d.])\d{1,3}\s*%/;
const NEGATION = /\b(no|not|never|without)\b|లేదు|కాదు|హామీ/i;

for (const key of KEYS) {
  for (const te of [false, true]) {
    const answers = pageFaq(key, { te }).map((row) => row.a).join(" ");
    for (const pattern of BANNED) {
      check(`${key} (${te ? "te" : "en"}): no "${pattern}"`, !pattern.test(answers));
    }
    const sentences = answers.split(/(?<=[.!?])\s+/);
    const unchecked = sentences.filter((sentence) => PERCENT.test(sentence) && !NEGATION.test(sentence));
    check(`${key} (${te ? "te" : "en"}): percentages only in denials`, unchecked.length === 0);
  }
  const en = pageFaq(key).map((row) => row.a).join(" ");
  const te = pageFaq(key, { te: true }).map((row) => row.a).join(" ");
  const namesALimit = /not (independently )?verified|not guaranteed|(no|not|never)[^.]{0,60}guarantee|does not (verify|guarantee|decide)|verif\w+ nothing|confirm/i;
  check(`${key}: states at least one honest limit`, namesALimit.test(en));
  check(`${key}: Telugu copy states a limit too`, /హామీ|ధృవీకరించ|నిర్ధారించ|లేదు/.test(te));
}

// page-specific promises that must be present
const SETS = {
  porutham: [/does not verify a person/i, /informational/i],
  muhurtham: [/not a personalised reading/i, /confirm/i],
  spotlight: [/promotional badge only/i, /no identity, reach, response or match guarantee/i, /profile\/media review/i],
  stories: [/not (independently )?verified/i, /consent|agreed to share/i],
  biodata: [/verifies nothing/i, /your device/i],
  lagna_patrika: [/do not print|you download/i, /free/i],
  pelli_choopulu: [/dowry in any form is illegal/i, /no fixed deadline/i],
  second_marriage: [/no separate plan/i, /not independently verified/i],
  districts: [/not independently verified/i, /NRI and other-states option/i],
};
for (const [key, patterns] of Object.entries(SETS)) {
  const text = pageFaq(key).map((row) => row.a).join(" ");
  for (const pattern of patterns) {
    check(`${key}: keeps "${pattern}"`, pattern.test(text));
  }
}

// ---------------------------------------------------------------- variables

const withCount = pageFaq("districts", { vars: { districtCount: 62 } });
check("district count is filled in", withCount.some((row) => /\(62\)/.test(row.a)));
const withoutCount = pageFaq("districts");
check("a missing variable drops the clause, leaving no gap", !withoutCount.some((row) => /\(\s*\)|\{\w+\}/.test(row.a)));
check("the sentence still reads without the count", withoutCount.every((row) => !/\s{2,}/.test(row.a)));
eq("unknown key yields nothing", pageFaq("nope"), []);
eq("no key yields nothing", pageFaq(), []);

// ---------------------------------------------------------------- shared facts

for (const name of Object.keys(FAQ_FACTS)) {
  const rule = FAQ_FACTS[name];
  check(`fact ${name} has both languages`, Boolean(rule.en) && Boolean(rule.te));
  check(`fact ${name} Telugu is Telugu`, /[ఀ-౿]/.test(rule.te));
  check(`fact ${name} never promises`, !/\bguaranteed success\b/i.test(rule.en)
    && rule.en.split(/(?<=[.!?])\s+/).every((sentence) => !PERCENT.test(sentence) || NEGATION.test(sentence)));
  eq(`fact(${name}) picks the language`, fact(name, true), rule.te);
  eq(`fact() unknown key is empty`, fact("nope"), "");
}
check("notVerified says verification is absent", /not independently verified/i.test(fact("notVerified")));

// ---------------------------------------------------------------- schema

const items = pageFaq("porutham");
const schema = pageFaqSchema(items);
eq("schema type", schema["@type"], "FAQPage");
eq("schema carries every question", schema.mainEntity.length, items.length);
check("answers are complete sentences", schema.mainEntity.every((row) => row.acceptedAnswer.text.length > 20));
eq("blank rows are dropped", pageFaqSchema([{ q: "", a: "" }, items[0]]).mainEntity.length, 1);
eq("garbage input yields empty schema", pageFaqSchema("nope").mainEntity, []);

const crumbs = pageBreadcrumb({ path: "/porutham", trail: [{ en: "Porutham", te: "పొంతన" }] });
eq("breadcrumb type", crumbs["@type"], "BreadcrumbList");
eq("positions are sequential", crumbs.itemListElement.map((row) => row.position), [1, 2]);
check("home comes first", crumbs.itemListElement[0].name === "Home");
check("last crumb is the page", crumbs.itemListElement[1].item.endsWith("/porutham"));
check("no double slashes", !crumbs.itemListElement.some((row) => /[^:]\/\//.test(row.item)));
eq("bare breadcrumb is just home", pageBreadcrumb().itemListElement.length, 1);

// ---------------------------------------------------------------- wiring

const PAGES = {
  districts: "districts",
  "second-marriage": "second_marriage",
  spotlight: "spotlight",
  porutham: "porutham",
  muhurtham: "muhurtham",
  biodata: "biodata",
  "lagna-patrika": "lagna_patrika",
  "pelli-choopulu": "pelli_choopulu",
  stories: "stories",
};
for (const [route, key] of Object.entries(PAGES)) {
  const source = readFileSync(new URL(`../src/app/${route}/page.tsx`, import.meta.url), "utf8");
  check(`/${route} builds page SEO for ${key}`, source.includes(`key: "${key}"`));
  check(`/${route} emits both JSON-LD blocks`, (source.match(/application\/ld\+json/g) || []).length === 2);
  check(`/${route} renders breadcrumbs`, source.includes("<Breadcrumbs"));
  check(`/${route} renders the FAQ`, source.includes("<FaqBlock"));
  check(`/${route} keeps its client component`, /return \(\s*<>[\s\S]*Page|Studio|Client|Guide/.test(source));
}

console.log(`page-faq: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
