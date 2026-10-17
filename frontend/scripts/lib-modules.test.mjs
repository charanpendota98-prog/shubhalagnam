/**
 * Behaviour tests for the lib modules that no other suite touched.
 *
 * The repo's other scripts transpile one helper with the TypeScript compiler and
 * import it as a data URL; this file generalises that into a tiny resolver so
 * whole modules (with their internal `@/lib/...` imports) can be executed in
 * Node. Browser-only imports (react, next/*) are stubbed, because every function
 * tested here is pure logic — no rendering.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../src/", import.meta.url));
const cache = new Map();
const visiting = new Set();
const EMPTY_MODULE = `data:text/javascript;base64,${Buffer.from("export default undefined;").toString("base64")}`;

const EXTENSIONS = ["", ".ts", ".tsx", ".mjs", "/index.ts", "/index.tsx"];

function resolveInternal(spec, fromFile) {
  const base = spec.startsWith("@/")
    ? path.join(SRC, spec.slice(2))
    : path.resolve(path.dirname(fromFile), spec);
  for (const ext of EXTENSIONS) {
    if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) return base + ext;
  }
  throw new Error(`cannot resolve ${spec} from ${fromFile}`);
}

/** Build a stub ESM module exporting exactly the names a bare import asks for. */
function stubModule(spec, source) {
  const names = new Set();
  let needsDefault = false;
  const statementRe = new RegExp(`import\\s+([^;'"]*?)\\s+from\\s+["']${spec.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}["']`, "gs");
  for (const match of source.matchAll(statementRe)) {
    const clause = match[1].trim();
    if (!clause || clause.startsWith("*")) continue;
    const braces = clause.match(/\{([^}]*)\}/s);
    if (braces) {
      for (const part of braces[1].split(",")) {
        const name = part.split(/\s+as\s+/)[0].trim();
        if (name) names.add(name);
      }
    }
    const head = clause.replace(/\{[^}]*\}/s, "").replace(/,/g, "").trim();
    if (head && !head.startsWith("*")) needsDefault = true;
  }
  const lines = [...names].map((name) => `export const ${name} = function ${name}() {};`);
  if (needsDefault) lines.push("export default function __stub() {};");
  const code = lines.length ? lines.join("\n") : "export default function __stub() {};";
  return `data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;
}

async function loadModule(file) {
  if (cache.has(file)) return cache.get(file);
  // Break import cycles with an empty module instead of recursing forever.
  if (visiting.has(file)) return EMPTY_MODULE;
  visiting.add(file);
  let source = fs.readFileSync(file, "utf8");
  // A type-only import is erased by the transpiler anyway, and skipping it keeps
  // type-only cycles (metadata-i18n <-> lang) out of the resolver's way.
  source = source.replace(/^import\s+type\s[^\n]*;\s*\n/gm, "");
  source = source.replace(/^\s*"use client";\n?/m, "");

  const specifiers = new Set(
    [...source.matchAll(/(?:^|\n)\s*(?:import|export)[^\n]*?\bfrom\s+["']([^"']+)["']/g)].map((m) => m[1]),
  );

  for (const spec of specifiers) {
    if (spec.startsWith(".") || spec.startsWith("@/") || spec.startsWith("/")) {
      const resolved = resolveInternal(spec.startsWith("/") ? `@${spec}` : spec, file);
      const url = resolved.endsWith(".mjs")
        ? pathToFileURL(resolved).href
        : await loadModule(resolved);
      source = source.split(`"${spec}"`).join(`"${url}"`).split(`'${spec}'`).join(`'${url}'`);
    } else {
      const url = stubModule(spec, source);
      source = source.split(`"${spec}"`).join(`"${url}"`).split(`'${spec}'`).join(`'${url}'`);
    }
  }

  const isTsx = file.endsWith(".tsx");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      jsx: isTsx ? ts.JsxEmit.ReactJSX : ts.JsxEmit.Preserve,
    },
    fileName: file,
  });
  const url = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
  visiting.delete(file);
  cache.set(file, url);
  return url;
}

const load = async (relative) => import(await loadModule(path.join(SRC, relative)));

const muhurtham = await load("lib/muhurtham-data.ts");
const photoUpload = await load("lib/photo-upload.ts");
const liveStats = await load("lib/live-stats.ts");
const channelLinks = await load("lib/channel-links.ts");
const pageSeo = await load("lib/page-seo.ts");
const metadataI18n = await load("lib/metadata-i18n.ts");

/* ------------------------------------------------------------------ *
 * muhurtham-data — the published reference calendar
 * ------------------------------------------------------------------ */
test("muhurtham calendar is populated, ordered and inside 2026-2027", () => {
  const rows = muhurtham.VIVAHA_MUHURTHAMS_2026_2027;
  assert.ok(rows.length >= 10, `expected a full calendar, got ${rows.length}`);
  let previous = "";
  for (const row of rows) {
    assert.ok(row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date), `bad date: ${row.date}`);
    assert.ok(["2026", "2027"].includes(row.date.slice(0, 4)), `year out of range: ${row.date}`);
    assert.ok(row.date >= previous, `calendar is not ascending at ${row.date}`);
    previous = row.date;
  }
});

test("muhurtham formatters answer in both languages and never blank out", () => {
  const row = muhurtham.VIVAHA_MUHURTHAMS_2026_2027[0];
  const formatters = [
    "formatMuhurthamDate",
    "formatMuhurthamMonth",
    "formatMuhurthamNakshatra",
    "formatMuhurthamLagnam",
    "formatMuhurthamThithi",
    "formatMuhurthamTime",
  ];
  for (const name of formatters) {
    const fn = muhurtham[name];
    assert.equal(typeof fn, "function", `${name} is missing`);
    for (const telugu of [false, true]) {
      const out = fn(row, telugu);
      assert.equal(typeof out, "string", `${name}(${telugu}) did not return a string`);
      assert.ok(out.trim().length > 0, `${name}(${telugu}) returned an empty string`);
    }
  }
  assert.match(muhurtham.formatMuhurthamDate(row, false), /\d/);
});

/* ------------------------------------------------------------------ *
 * photo-upload — client-side limits and honest error copy
 * ------------------------------------------------------------------ */
test("profile photo upload keeps a 5 MB ceiling and typed errors", () => {
  assert.equal(photoUpload.PROFILE_PHOTO_MAX_UPLOAD_BYTES, 5 * 1024 * 1024);
  const error = new photoUpload.ProfilePhotoError("type");
  assert.equal(error.code, "type");
  assert.equal(error.name, "ProfilePhotoError");
  assert.ok(error instanceof Error);
});

test("every photo error code has both languages of copy", () => {
  const codes = ["missing", "type", "size", "decode", "dimensions", "encode"];
  for (const code of codes) {
    const en = photoUpload.profilePhotoErrorMessage(code, false);
    const te = photoUpload.profilePhotoErrorMessage(code, true);
    assert.ok(en && en.trim() === en.trim(), `English copy missing for ${code}`);
    assert.ok(te && te.trim() === te.trim(), `Telugu copy missing for ${code}`);
    assert.notEqual(en, te, `${code} copy is not localized`);
  }
  // An unknown code must degrade to a readable message, never an empty box.
  assert.ok(String(photoUpload.profilePhotoErrorMessage("nope", false)).length > 0);
});

/* ------------------------------------------------------------------ *
 * live-stats — truthful counters, never padded numbers
 * ------------------------------------------------------------------ */
test("stats fallback describes coverage, not invented member numbers", () => {
  const { STATS_FALLBACK } = liveStats;
  assert.equal(STATS_FALLBACK.stats_are_live, false);
  assert.equal(STATS_FALLBACK.profiles_count, 0);
  assert.equal(STATS_FALLBACK.interests_sent, 0);
  // The only non-zero figure is the bundled catalogue size, which is a fact
  // about the directory itself rather than a claim about members.
  for (const [key, value] of Object.entries(STATS_FALLBACK)) {
    if (typeof value !== "number") continue;
    if (key === "castes_covered") assert.ok(value > 0, "catalogue coverage should be real");
    else assert.equal(value, 0, `${key} must not be pre-filled`);
  }
});

test("live-stats formatting hides a bare zero and groups real counts", () => {
  assert.equal(liveStats.fmtNum(0), "0");
  assert.equal(liveStats.fmtNum(Number.NaN), "0");
  assert.match(liveStats.fmtNum(123456), /,/);
  assert.equal(liveStats.profilesLabel({ profiles_count: 0 }, "en"), "Community options");
  assert.ok(!liveStats.profilesLabel({ profiles_count: 0 }, "te").includes("0"));
  assert.equal(liveStats.profilesLabel({ profiles_count: 12 }, "en"), "12+");
  assert.equal(typeof liveStats.useLiveStats, "function");
});

/* ------------------------------------------------------------------ *
 * channel-links — never fabricate a channel destination
 * ------------------------------------------------------------------ */
const DIRECTORY = (links, authoritative = true) => ({ links, authoritative });

test("channel links fall back to the bundled registry before the API answers", () => {
  const channel = { key: "reddy", link: "https://t.me/manavivaha", whatsappLink: "https://whatsapp.com/channel/abcd1234abcd" };
  const resolved = channelLinks.resolveChannelLinks(channel, DIRECTORY({}, false));
  assert.equal(resolved.telegram, channel.link);
  assert.equal(resolved.whatsapp, channel.whatsappLink);
  assert.equal(resolved.whatsappIsDirect, true);
});

test("channel links drop invalid URLs and follow the backend when authoritative", () => {
  const channel = { key: "reddy", link: "https://t.me/manavivaha", whatsappLink: "https://whatsapp.com/channel/abcd1234abcd" };
  const spoofed = channelLinks.resolveChannelLinks(
    { ...channel, link: "https://example.com/not-telegram", whatsappLink: "https://example.com/hello" },
    DIRECTORY({}, false),
  );
  assert.equal(spoofed.telegram, "");
  assert.equal(spoofed.whatsapp, "");
  assert.equal(spoofed.whatsappIsDirect, false);

  const mapped = channelLinks.resolveChannelLinks(channel, DIRECTORY({
    reddy: { telegram: "https://t.me/officialreddy", whatsapp: "" },
  }));
  assert.equal(mapped.telegram, "https://t.me/officialreddy");
  assert.equal(mapped.whatsapp, "");
  assert.equal(mapped.whatsappIsDirect, false);

  // http (not https) and look-alike hosts are rejected rather than "fixed up".
  for (const bad of ["http://t.me/reddy", "https://t.me.evil.example/reddy", "javascript:alert(1)"]) {
    const out = channelLinks.resolveChannelLinks({ ...channel, link: bad }, DIRECTORY({}, false));
    assert.equal(out.telegram, "", bad);
  }
});

/* ------------------------------------------------------------------ *
 * page-seo — FAQ copy and schema stay one source of truth
 * ------------------------------------------------------------------ */
test("buildPageSeo emits matching English/Telugu FAQs and valid JSON-LD", () => {
  const seo = pageSeo.buildPageSeo({
    key: "stories",
    path: "/stories",
    trail: [{ en: "Home", te: "హోమ్", href: "/" }, { en: "Member Stories", te: "సభ్యుల కథలు", href: "/stories" }],
  });
  assert.ok(seo.faqEn.length > 0, "English FAQ is empty");
  assert.equal(seo.faqEn.length, seo.faqTe.length, "languages describe different question counts");
  for (let i = 0; i < seo.faqEn.length; i += 1) {
    assert.equal(seo.faqEn[i].id, seo.faqTe[i].id, "FAQ ids drifted between languages");
    assert.ok(seo.faqEn[i].q && seo.faqEn[i].a);
    assert.ok(seo.faqTe[i].q && seo.faqTe[i].a);
  }
  const faq = JSON.parse(seo.faqJsonLd);
  assert.equal(faq["@type"], "FAQPage");
  assert.equal(faq.mainEntity.length, seo.faqEn.length);
  const crumbs = JSON.parse(seo.crumbJsonLd);
  assert.equal(crumbs["@type"], "BreadcrumbList");
  assert.equal(crumbs.itemListElement.length, 2);
});

test("page SEO serialisation can never break out of a script tag", () => {
  const seo = pageSeo.buildPageSeo({
    key: "stories",
    path: "/stories",
    trail: [{ en: "</script><script>alert(1)</script>", te: "హోమ్", href: "/stories" }],
  });
  for (const block of [seo.faqJsonLd, seo.crumbJsonLd]) {
    assert.ok(!block.includes("</script"), "raw closing script tag survived serialisation");
    assert.ok(!block.includes("<script"), "raw script tag survived serialisation");
    assert.doesNotThrow(() => JSON.parse(block));
  }
});

/* ------------------------------------------------------------------ *
 * metadata-i18n — every route answers in both languages
 * ------------------------------------------------------------------ */
test("route metadata is localized for both languages", () => {
  const en = metadataI18n.getLocalizedPageMetadata("/", "en");
  const te = metadataI18n.getLocalizedPageMetadata("/", "te");
  assert.ok(en && te);
  assert.match(en.title, /Mana Vivaha/);
  assert.notEqual(en.title, te.title);
  assert.ok(en.description.length > 20 && te.description.length > 20);
});

test("route metadata covers dynamic routes and declines unknown ones", () => {
  for (const route of ["/castes/reddy", "/vendors/some-vendor", "/r/ABC123"]) {
    for (const lang of ["en", "te"]) {
      const copy = metadataI18n.getLocalizedPageMetadata(route, lang);
      assert.ok(copy, `${route} (${lang}) has no metadata`);
      assert.ok(copy.title.includes("|"), `${route} (${lang}) is missing the brand suffix`);
      assert.ok(copy.description.length > 20);
    }
  }
  assert.equal(metadataI18n.getLocalizedPageMetadata("/no-such-page", "en"), null);
  // Trailing slashes and /blog/<unknown-slug> must degrade quietly, not throw.
  assert.ok(metadataI18n.getLocalizedPageMetadata("/stories/", "en"));
  assert.doesNotThrow(() => metadataI18n.getLocalizedPageMetadata("/blog/does-not-exist", "te"));
});
