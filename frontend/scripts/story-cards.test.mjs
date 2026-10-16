/**
 * Privacy + copy rules for public story cards.
 */
import { readFileSync } from "node:fs";

import {
  PRIVATE_KEYS,
  publicStoryFields,
  storyExcerpt,
  storyCard,
  storyCards,
  storyDisclaimer,
} from "../src/lib/story-cards.mjs";

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
  check(`${label} (got ${a})`, a === b);
}

const SAMPLE = {
  story_id: "STORY-0007",
  tsap_id: "TSAP-2-2026-000123",
  partner_id: "TSAP-1-2026-000045",
  couple_names: "Ramesh & Sita",
  text: "  We met through this platform   and got married in March. ",
  district: "Warangal",
  photo_url: "https://cdn.example.com/a.jpg",
  likes: 4,
  created_at: "2026-03-11T10:00:00Z",
  status: "approved",
};

// ---------------------------------------------------------------- privacy

for (const key of ["tsap_id", "partner_id", "phone", "email", "whatsapp"]) {
  check(`${key} never survives publicStoryFields`, !(key in publicStoryFields({ ...SAMPLE, [key]: "secret" })));
}

check("private key list is stable", PRIVATE_KEYS.length >= 5 && PRIVATE_KEYS.includes("tsap_id"));
check("blocking is case-insensitive", !("TSAP_ID" in publicStoryFields({ TSAP_ID: "x" })));
check("unknown non-identifier fields pass through", publicStoryFields({ district: "Nalgonda" }).district === "Nalgonda");
check("garbage input yields an empty object", Object.keys(publicStoryFields(null)).length === 0);

const card = storyCard(SAMPLE);
check("card exists", !!card);
check("card id kept", card.id === "STORY-0007");
check("card names kept", card.names === "Ramesh & Sita");
eq("card serialises with no identifier", Object.keys(card).sort(), [
  "date",
  "district",
  "excerpt",
  "id",
  "likes",
  "names",
  "photo",
  "text",
]);
check("no JSON dump of a card can leak a profile id", !JSON.stringify(card).includes("TSAP-"));

// ---------------------------------------------------------------- content

check("collapses whitespace", card.text === "We met through this platform and got married in March.");
eq("date is day precision", card.date, "2026-03-11");
eq("likes coerced", card.likes, 4);

eq("short text is untouched", storyExcerpt("Hello there"), "Hello there");
const spaced = "word ".repeat(40).trim();
const long = storyExcerpt(spaced, 100);
const body = long.slice(0, -1);
check("excerpt respects the limit", long.length <= 101);
check("excerpt ends with an ellipsis", long.endsWith("…"));
check("excerpt is a prefix of the original text", spaced.startsWith(body));
check("excerpt breaks at a word boundary", spaced[body.length] === " ");
const noSpaces = storyExcerpt("a".repeat(300), 50);
check("unbreakable text still respects the limit", noSpaces.length <= 51 && noSpaces.endsWith("…"));

// ---------------------------------------------------------------- emptiness

eq("empty record makes no card", storyCard({}), null);
eq("identifier-only record makes no card", storyCard({ tsap_id: "TSAP-1" }), null);
eq("non-object makes no card", storyCard("nope"), null);
eq("whitespace-only text makes no card", storyCard({ text: "   " }), null);
check("a nameless story still shows its text", !!storyCard({ text: "We met here." }));

// ---------------------------------------------------------------- lists

const many = [SAMPLE, { tsap_id: "x" }, { ...SAMPLE, story_id: "STORY-0008" }, {}, null];
eq("unshowable rows are dropped", storyCards(many).length, 2);
eq("limit caps the list", storyCards(many, { limit: 1 }).length, 1);
eq("non-array input is empty", storyCards(undefined), []);

// ---------------------------------------------------------------- disclaimer

check("English disclaimer says not verified", /not independently verified/i.test(storyDisclaimer(false)));
check("Telugu disclaimer says not verified", /ధృవీకరించబడవు/.test(storyDisclaimer(true)));
check("disclaimer never promises an outcome", !/guarantee/i.test(storyDisclaimer(false)));

// ---------------------------------------------------------------- wiring

const source = readFileSync(new URL("../src/components/HomeStories.tsx", import.meta.url), "utf8");
check("HomeStories uses storyCards", /storyCards\(/.test(source));
check("HomeStories renders the disclaimer", /storyDisclaimer\(/.test(source));
check("HomeStories never renders tsap_id", !/tsap_id/.test(source));

console.log(`story-cards: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
