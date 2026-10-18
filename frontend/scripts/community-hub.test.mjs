/**
 * Static tests for the community-hub resolver.
 * Run: npm run test:hub
 */
import { readFileSync } from "node:fs";

import { communityHubPath, hubAliases, HUB_ALIASES, normalizeCommunity, roleForGender } from "../src/lib/community-hub.mjs";

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    passed += 1;
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "expected a truthy value");
}

function eq(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${message || "mismatch"}: got ${a}, expected ${b}`);
}

const HUBS = [
  { key: "reddy", name: "Reddy" },
  { key: "kamma", name: "Kamma" },
  { key: "koppula_velama", name: "Koppula Velama" },
  { key: "aryavysya", name: "Arya Vysya" },
];

check("normalizeCommunity handles the spellings members and hubs use", () => {
  eq(normalizeCommunity("Koppula Velama"), "koppula_velama");
  eq(normalizeCommunity("  koppula-velama "), "koppula_velama");
  eq(normalizeCommunity("REDDY"), "reddy");
  eq(normalizeCommunity(""), "");
  eq(normalizeCommunity(null), "");
});

check("roleForGender maps registration values and Telugu words", () => {
  eq(roleForGender("Bride"), "bride");
  eq(roleForGender("Groom"), "groom");
  eq(roleForGender("female"), "bride");
  eq(roleForGender("Male"), "groom");
  eq(roleForGender("అమ్మాయి"), "bride");
  eq(roleForGender("అబ్బాయి"), "groom");
  eq(roleForGender(""), "");
  eq(roleForGender(undefined), "");
  eq(roleForGender("something else"), "");
});

check("a bride gets the bride hub, a groom the groom hub", () => {
  eq(communityHubPath({ community: "Reddy", gender: "Bride", hubs: HUBS }).href, "/castes/reddy-bride");
  eq(communityHubPath({ community: "Reddy", gender: "Groom", hubs: HUBS }).href, "/castes/reddy-groom");
});

check("multi-word communities match their slug, not just their name", () => {
  const result = communityHubPath({ community: "Koppula Velama", gender: "Groom", hubs: HUBS });
  eq(result.href, "/castes/koppula_velama-groom");
  eq(result.hubName, "Koppula Velama");
  eq(result.matched, true);
});

check("a shorter community name still finds its longer hub name", () => {
  const hubs = [{ key: "padmashali_weavers", name: "Padmashali Weavers" },
                { key: "raju_kshatriya", name: "Raju Kshatriya" }];
  eq(communityHubPath({ community: "Padmashali", gender: "Bride", hubs }).href,
     "/castes/padmashali_weavers-bride");
  eq(communityHubPath({ community: "Raju", gender: "Groom", hubs }).href,
     "/castes/raju_kshatriya-groom");
});

check("prefix matching never crosses communities", () => {
  const hubs = [{ key: "arya_vysya", name: "Arya Vysya" }, { key: "yadava_goud", name: "Yadava Goud" }];
  // "Vysya" and "Goud" are different communities from these hubs' full names.
  eq(communityHubPath({ community: "Vysya", gender: "Bride", hubs }).matched, false);
  eq(communityHubPath({ community: "Goud", gender: "Bride", hubs }).matched, false);
  // Very short inputs never prefix-match.
  eq(communityHubPath({ community: "Ya", gender: "Bride", hubs: [{ key: "yadava", name: "Yadava" }] }).matched, false);
});

check("an unknown community falls back to the directory, never a guess", () => {
  const result = communityHubPath({ community: "Not A Community", gender: "Bride", hubs: HUBS });
  eq(result.href, "/castes");
  eq(result.matched, false);
});

check("no community or no gender means no hub claim", () => {
  eq(communityHubPath({ community: "", gender: "Bride", hubs: HUBS }).href, "/castes");
  eq(communityHubPath({ community: "Reddy", gender: "", hubs: HUBS }).href, "/castes");
  eq(communityHubPath({ hubs: HUBS }).href, "/castes");
  eq(communityHubPath().href, "/castes");
});

check("an empty or missing hub list never produces a link", () => {
  eq(communityHubPath({ community: "Reddy", gender: "Bride", hubs: [] }).href, "/castes");
  eq(communityHubPath({ community: "Reddy", gender: "Bride", hubs: null }).href, "/castes");
});

check("the fallback is configurable and always safe", () => {
  eq(communityHubPath({ community: "X", gender: "Bride", hubs: HUBS, fallback: "/channels" }).href, "/channels");
  const url = communityHubPath({ community: "Reddy", gender: "Bride", hubs: HUBS }).href;
  assert(url.startsWith("/castes/") && !url.includes("//"), `unexpected href ${url}`);
});

// ------------------------------------------------------------------ aliases

const REAL_HUBS = (() => {
  // Mirror of seo-pages.casteKeysInOrder() + casteDisplayName() so the test
  // exercises the same hub list the register page passes at runtime.
  const src = readFileSync(new URL("../src/lib/channels.ts", import.meta.url), "utf8");
  const seen = new Map();
  const re = /"key"\s*:\s*"(c_[a-z0-9_]+)"[\s\S]{0,800}?"name"\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) {
    const key = m[1].slice(2).replace(/_(?:bride|groom)$/, "");
    if (seen.has(key)) continue;
    const clean = m[2]
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
      .split("|")[0]
      .trim()
      .replace(/\s*(Brides|Grooms|Matrimony)$/i, "")
      .trim();
    seen.set(key, { key, name: clean || key.replace(/_/g, " ") });
  }
  return [...seen.values()];
})();

check("the real channel registry was parsed", () => {
  assert(REAL_HUBS.length >= 20, `expected the full hub list, got ${REAL_HUBS.length}`);
  assert(REAL_HUBS.some((hub) => hub.key === "reddy"), "reddy hub missing");
});

check("every hub is reachable from its own display name", () => {
  for (const hub of REAL_HUBS) {
    const result = communityHubPath({ community: hub.name, gender: "Bride", hubs: REAL_HUBS });
    assert(result.matched, `${hub.name} (${hub.key}) did not resolve to itself`);
    eq(result.hubKey, hub.key, `${hub.name} resolved to the wrong hub`);
  }
});

/** Registration-form spellings that must still reach the right group. */
const ALIAS_CASES = [
  ["Arya Vysya", "vysya"],
  ["Vysya", "vysya"],
  ["Komati", "vysya"],
  ["Viswabrahmin", "viswabrahmana"],
  ["Viswakarma", "viswabrahmana"],
  ["Kuruba", "kuruma"],
  ["Kummara", "kummari"],
  ["Devanga", "padmashali_weavers"],
  ["Padmashali", "padmashali_weavers"],
  ["Balija", "kapu"],
  ["Telaga", "kapu"],
  ["Yadava", "yadava_goud"],
  ["Golla", "yadava_goud"],
  ["Lambada", "lambada_banjara"],
  ["Banjara", "lambada_banjara"],
  ["Kshatriya", "raju_kshatriya"],
  ["Raju", "raju_kshatriya"],
  ["Koppula Velama", "velama"],
  ["Mudiraj", "mudiraj"],
  ["Perika", "perika"],
  ["Rajaka", "rajaka"],
  ["Goud", "goud"],
];

check("community spellings from the form reach their real hub", () => {
  for (const [community, expected] of ALIAS_CASES) {
    const result = communityHubPath({ community, gender: "Groom", hubs: REAL_HUBS });
    eq(result.hubKey, expected, `${community} did not reach ${expected}`);
    eq(result.matched, true, `${community} was not matched`);
    eq(result.href, `/castes/${expected}-groom`, `${community} produced a wrong link`);
  }
});

check("a community with its own hub is never sent to another hub", () => {
  const hubs = [{ key: "goud", name: "Goud" }, { key: "yadava_goud", name: "Yadava • Golla" }];
  eq(communityHubPath({ community: "Goud", gender: "Bride", hubs }).hubKey, "goud");
  eq(communityHubPath({ community: "Yadava", gender: "Bride", hubs }).hubKey, "yadava_goud");
});

check("the names inside a combined channel only match when nothing exact does", () => {
  const hubs = [{ key: "kapu", name: "Kapu • Balija • Telaga" }];
  eq(communityHubPath({ community: "Kapu", gender: "Bride", hubs }).hubKey, "kapu");
  eq(communityHubPath({ community: "Balija", gender: "Bride", hubs }).hubKey, "kapu");
  eq(communityHubPath({ community: "Telaga", gender: "Bride", hubs }).hubKey, "kapu");
  eq(communityHubPath({ community: "Kamma", gender: "Bride", hubs }).matched, false);
});

check("an alias is ignored when the hub it points at does not exist", () => {
  const hubs = [{ key: "reddy", name: "Reddy" }];
  eq(communityHubPath({ community: "Kuruba", gender: "Bride", hubs }).matched, false);
  eq(communityHubPath({ community: "Kuruba", gender: "Bride", hubs }).href, "/castes");
});

check("communities with no channel fall back honestly, never to a neighbour", () => {
  // "Intercaste" and a self-described community have no channel of their own —
  // they must not be quietly attached to someone else's group.
  for (const community of ["Intercaste", "Other / self-described", "Not A Community"]) {
    const result = communityHubPath({ community, gender: "Bride", hubs: REAL_HUBS });
    eq(result.matched, false, `${community} should not claim a hub`);
    eq(result.href, "/castes", `${community} should fall back to the directory`);
  }
});

check("hubAliases keeps a hub's own names stronger than borrowed ones", () => {
  const { strong, loose } = hubAliases({ key: "kapu", name: "Kapu • Balija • Telaga" });
  assert(strong.includes("kapu"), "key must be a strong alias");
  assert(loose.includes("balija") && loose.includes("telaga"), "combined names must be loose");
  assert(!strong.includes("balija"), "borrowed names must not be strong");
});

/** Registry keys that exist but are deliberately kept out of the public directory.
 *  Empty since the ST Others community was published (split bride/groom like the
 *  rest); the knob stays for any future community that needs holding back. */
const NON_PUBLIC_HUBS = [];

check("aliases never map a community onto an unrelated one", () => {
  for (const [from, to] of Object.entries(HUB_ALIASES)) {
    assert(typeof from === "string" && from.length > 2, `bad alias key ${from}`);
    const known = REAL_HUBS.some((hub) => hub.key === to) || NON_PUBLIC_HUBS.includes(to);
    assert(known, `alias ${from} targets an unknown hub ${to}`);
  }
  // Vysya and Goud are separate communities with their own hubs.
  eq(HUB_ALIASES.vysya, "vysya");
  assert(!("goud" in HUB_ALIASES) || HUB_ALIASES.goud === "goud", "goud must not be aliased away");
});

console.log(`\n# tests ${passed + failed}\n# pass ${passed}\n# fail ${failed}`);
if (failed > 0) process.exit(1);
