/**
 * Static tests for the community-hub resolver.
 * Run: npm run test:hub
 */
import { communityHubPath, normalizeCommunity, roleForGender } from "../src/lib/community-hub.mjs";

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

console.log(`\n# tests ${passed + failed}\n# pass ${passed}\n# fail ${failed}`);
if (failed > 0) process.exit(1);
