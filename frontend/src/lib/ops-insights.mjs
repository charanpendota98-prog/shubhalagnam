/**
 * Formatting helpers for the control-dashboard operations insights.
 *
 * Pure and dependency-free. These only describe aggregate counts the backend
 * already computed — they never estimate, extrapolate or score anything, and a
 * share is only produced when there is a real denominator.
 */

export const AGING_LABELS = {
  under_24h: { en: "Under 24 hours", te: "24 గంటల లోపు" },
  "1_3_days": { en: "1–3 days", te: "1–3 రోజులు" },
  "3_7_days": { en: "3–7 days", te: "3–7 రోజులు" },
  over_7_days: { en: "Over 7 days", te: "7 రోజుల కంటే ఎక్కువ" },
};

export const FUNNEL_LABELS = {
  registered: { en: "Registered", te: "రిజిస్టర్ అయ్యారు" },
  photo_added: { en: "Added a photo", te: "ఫోటో జోడించారు" },
  approved: { en: "Approved", te: "ఆమోదించబడింది" },
  sent_first_interest: { en: "Sent a first request", te: "మొదటి అభ్యర్థన పంపారు" },
};

export const INTEREST_STATUS_LABELS = {
  pending: { en: "Awaiting reply", te: "సమాధానం కోసం" },
  accepted: { en: "Accepted", te: "అంగీకరించారు" },
  declined: { en: "Declined", te: "తిరస్కరించారు" },
  expired: { en: "Expired", te: "గడువు ముగిసింది" },
  withdrawn: { en: "Withdrawn", te: "ఉపసంహరించారు" },
};

function pick(map, key, te) {
  const entry = map[String(key || "")];
  if (entry) return te ? entry.te : entry.en;
  // Unknown keys are shown as plain words rather than raw snake_case.
  return String(key || "").replace(/[_-]+/g, " ").trim() || (te ? "ఇతర" : "Other");
}

/** @param {string} key @param {boolean} te */
export function agingLabel(key, te) {
  return pick(AGING_LABELS, key, te);
}

/** @param {string} step @param {boolean} te */
export function funnelLabel(step, te) {
  return pick(FUNNEL_LABELS, step, te);
}

/** @param {string} status @param {boolean} te */
export function interestStatusLabel(status, te) {
  return pick(INTEREST_STATUS_LABELS, status, te);
}

/**
 * Whole-percent share of a base count. Returns null when there is no
 * denominator, so callers show nothing rather than "0%" or "NaN%".
 * @param {number} count
 * @param {number} base
 */
export function sharePercent(count, base) {
  const value = Number(count);
  const total = Number(base);
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return null;
  const pct = Math.round((Math.max(0, value) / total) * 100);
  return Math.min(100, pct);
}

/**
 * Funnel rows with labels and an optional share of the first step.
 * @param {{ step: string, count: number }[]} funnel
 * @param {boolean} te
 */
export function funnelRows(funnel, te) {
  const rows = Array.isArray(funnel) ? funnel : [];
  const base = rows.length ? Number(rows[0]?.count) || 0 : 0;
  return rows.map((row, index) => ({
    step: String(row?.step || ""),
    label: funnelLabel(row?.step, te),
    count: Math.max(0, Number(row?.count) || 0),
    share: index === 0 ? null : sharePercent(row?.count, base),
  }));
}

/**
 * "2 days", "36 hours" — a duration, never a promise about when it clears.
 * @param {number} hours
 * @param {boolean} te
 */
export function hoursLabel(hours, te) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return te ? "ఇంకా లేదు" : "None waiting";
  if (value < 1) return te ? "ఒక గంట కంటే తక్కువ" : "Under an hour";
  if (value < 48) return te ? `${Math.round(value)} గంటలు` : `${Math.round(value)} hours`;
  const days = value / 24;
  const rounded = days >= 10 ? Math.round(days) : Math.round(days * 10) / 10;
  return te ? `${rounded} రోజులు` : `${rounded} days`;
}

/**
 * Week-over-week signup movement. Reported as a plain difference; a percentage
 * is only shown when the previous period had a real, non-zero count.
 * @param {{ last_7d?: number, previous_7d?: number, delta?: number }} trend
 * @param {boolean} te
 */
export function trendLabel(trend, te) {
  const last = Math.max(0, Number(trend?.last_7d) || 0);
  const previous = Math.max(0, Number(trend?.previous_7d) || 0);
  const delta = Number.isFinite(Number(trend?.delta)) ? Number(trend.delta) : last - previous;
  if (previous === 0) {
    return te
      ? `గత 7 రోజుల్లో ${last} — పోల్చడానికి అంతకుముందు వారం ఖాళీ`
      : `${last} in the last 7 days — no earlier week to compare`;
  }
  const pct = Math.round((Math.abs(delta) / previous) * 100);
  const direction = delta > 0 ? (te ? "ఎక్కువ" : "up") : delta < 0 ? (te ? "తక్కువ" : "down") : (te ? "మార్పు లేదు" : "no change");
  if (delta === 0) return te ? `గత 7 రోజుల్లో ${last} — మార్పు లేదు` : `${last} in the last 7 days — no change`;
  return te
    ? `గత 7 రోజుల్లో ${last} — అంతకుముందు వారం కంటే ${Math.abs(delta)} ${direction} (${pct}%)`
    : `${last} in the last 7 days — ${Math.abs(delta)} ${direction} (${pct}%) on the week before`;
}

/**
 * Interest-request statuses in a stable, meaningful order.
 * @param {{ label: string, count: number }[]} statuses
 * @param {boolean} te
 */
export function interestStatusRows(statuses, te) {
  const rows = Array.isArray(statuses) ? statuses : [];
  const order = ["pending", "accepted", "declined", "expired", "withdrawn"];
  return [...rows]
    .sort((a, b) => {
      const ai = order.indexOf(String(a?.label || ""));
      const bi = order.indexOf(String(b?.label || ""));
      return (ai < 0 ? order.length : ai) - (bi < 0 ? order.length : bi);
    })
    .map((row) => ({
      label: interestStatusLabel(row?.label, te),
      count: Math.max(0, Number(row?.count) || 0),
    }));
}
