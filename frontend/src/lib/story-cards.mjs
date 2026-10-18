/**
 * Turn backend story records into cards that are safe to show publicly.
 *
 * A story is approved for *publication*, not verified, and the record it comes
 * from carries member identifiers. This module is the single place that decides
 * what may leave the browser: names the submitter supplied, the district, the
 * story text and the photo — never a profile ID, partner ID, phone or email.
 *
 * Pure and dependency-free.
 */

/** Fields that must never reach a public card, whatever the backend adds later. */
export const PRIVATE_KEYS = [
  "tsap_id",
  "partner_id",
  "from_id",
  "to_id",
  "phone",
  "phone_masked",
  "email",
  "contact",
  "whatsapp",
  "token",
  "otp",
  "created_by",
];

/**
 * Keep only the keys a public card is allowed to use.
 * @param {Record<string, any>} story
 * @returns {Record<string, any>}
 */
export function publicStoryFields(story) {
  const record = story && typeof story === "object" ? story : {};
  const blocked = new Set(PRIVATE_KEYS.map((key) => key.toLowerCase()));
  const safe = {};
  for (const [key, value] of Object.entries(record)) {
    if (blocked.has(String(key).toLowerCase())) continue;
    safe[key] = value;
  }
  return safe;
}

/**
 * Trim a story to a readable card length without cutting a word in half.
 * @param {unknown} text
 * @param {number} [max]
 * @returns {string}
 */
export function storyExcerpt(text, max = 220) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Build a card. Returns null when there is nothing honest to show — an empty
 * story must never become invented filler.
 * @param {Record<string, any>} story
 * @param {{ max?: number }} [options]
 */
export function storyCard(story, options = {}) {
  const safe = publicStoryFields(story);
  const names = String(safe.couple_names ?? safe.names ?? "").trim();
  const body = String(safe.text ?? safe.story_en ?? safe.story_te ?? "").replace(/\s+/g, " ").trim();
  if (!names && !body) return null;
  const max = Number(options.max) > 0 ? Number(options.max) : 220;
  return {
    id: String(safe.story_id ?? safe.id ?? ""),
    names,
    district: String(safe.district ?? "").trim(),
    text: body,
    excerpt: storyExcerpt(body, max),
    photo: String(safe.photo_url ?? safe.photo ?? "").trim(),
    likes: Math.max(0, Number(safe.likes) || 0),
    date: String(safe.created_at ?? "").slice(0, 10),
  };
}

/**
 * Cards for a list of stories, dropping anything that cannot be shown.
 * @param {unknown} stories
 * @param {{ max?: number, limit?: number }} [options]
 */
export function storyCards(stories, options = {}) {
  const rows = Array.isArray(stories) ? stories : [];
  const cards = rows.map((row) => storyCard(row, options)).filter(Boolean);
  const limit = Number(options.limit) > 0 ? Number(options.limit) : 0;
  return limit ? cards.slice(0, limit) : cards;
}

/**
 * The note that travels with every card: approval is not verification.
 * @param {boolean} te
 */
export function storyDisclaimer(te) {
  return te
    ? "ఈ కథలు సభ్యులు పంపినవి, ప్రచురణకు మాత్రమే సమీక్షించబడ్డాయి — గుర్తింపు లేదా సంబంధ వివరాలు స్వతంత్రంగా ధృవీకరించబడవు."
    : "Stories are member-submitted and reviewed for publication only — identity and relationship details are not independently verified.";
}
