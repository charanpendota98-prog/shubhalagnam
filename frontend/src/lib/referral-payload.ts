// Validate API data before private money or invite panels can render it.
// HTTP 200 and TypeScript annotations alone do not establish a valid payload.
type Row = Record<string, unknown>;
const record = (x: unknown): x is Row => !!x && typeof x === "object" && !Array.isArray(x);
const number = (x: unknown): boolean => typeof x === "number" && Number.isFinite(x);
const text = (x: unknown): boolean => typeof x === "string";
const fields = (x: unknown, keys: string[], check: (value: unknown) => boolean): x is Row =>
  record(x) && keys.every(key => check(x[key]));
const texts = (x: unknown, keys: string[]): x is Row => fields(x, keys, text);
const numbers = (x: unknown, keys: string[]): x is Row => fields(x, keys, number);
const rows = (x: unknown, check: (value: unknown) => boolean): boolean => Array.isArray(x) && x.every(check);
const optionalTexts = (x: Row, keys: string[]): boolean => keys.every(key => x[key] === undefined || text(x[key]));
const optionalNumbers = (x: Row, keys: string[]): boolean => keys.every(key => x[key] === undefined || number(x[key]));
const notes = (x: unknown): x is Row => texts(x, ["note_en", "note_te"]);
const formula = (x: unknown): x is Row => texts(x, ["formula_en", "formula_te"]);

export function validStatement(x: unknown): boolean {
  return notes(x) && number(x.wallet) && rows(x.entries, row =>
    texts(row, ["id", "at", "type", "label_en", "label_te"]) && numbers(row, ["amount", "balance_after"]) &&
    optionalTexts(row, ["from_name", "plan_code", "utr", "note"])) &&
    numbers(x.totals, ["earned", "reversed", "returned", "pending_payout", "paid_out", "lifetime_earned"]) &&
    formula(x.identity) && numbers(x.identity, ["expected_wallet", "actual_wallet"]) &&
    typeof x.identity.reconciles === "boolean" && number(x.min_payout) && typeof x.can_request_payout === "boolean";
}

export function validEarnings(x: unknown): boolean {
  return notes(x) && formula(x) &&
    numbers(x.counts, ["registered", "rewarded", "waiting", "reversed", "invited_only"]) &&
    numbers(x.totals, ["reward_per_friend", "rewards_count", "gross_earned", "reversed", "pending_payout", "paid_out", "wallet"]) &&
    rows(x.rows, row => texts(row, ["tsap_id", "name", "stage", "joined_at", "why_en", "why_te", "next_en", "next_te"]) &&
      number(row.reward) && rows(row.timeline, step => texts(step, ["at", "label_en", "label_te"])));
}

export function validInvite(x: unknown): boolean {
  return texts(x, ["token", "name", "link", "channel", "stage", "stage_en", "stage_te", "next_en", "next_te", "sent_at"]) &&
    (x.sent_days_ago === null || number(x.sent_days_ago)) && typeof x.needs_followup === "boolean" &&
    optionalTexts(x, ["phone_masked", "joined_tsap", "message_en", "message_te"]) && optionalNumbers(x, ["reward", "send_count"]);
}

export function validInvites(x: unknown): boolean {
  return record(x) && rows(x.invites, validInvite);
}

export function validInsights(x: unknown): boolean {
  return notes(x) && numbers(x.conversion, ["clicks", "registrations", "rewarded"]) &&
    texts(x.conversion, ["sample_size_note_en", "sample_size_note_te"]) &&
    typeof x.conversion.small_sample === "boolean" &&
    ["click_to_join_pct", "join_to_reward_pct"].every(key => x.conversion && record(x.conversion) &&
      (x.conversion[key] === null || number(x.conversion[key]))) &&
    rows(x.channels, row => texts(row, ["channel"]) && numbers(row, ["sent", "clicked", "joined", "rewarded"])) &&
    (x.best_channel === null || texts(x.best_channel, ["channel", "reason_en", "reason_te"])) &&
    rows(x.followups, row => texts(row, ["token", "name", "reason_en", "reason_te"]) && number(row.days) &&
      texts(row.share, ["whatsapp_en", "whatsapp_te", "telegram_en", "telegram_te", "sms_en", "sms_te", "link"])) &&
    rows(x.next_actions, row => texts(row, ["title_en", "title_te", "why_en", "why_te", "href"]));
}
