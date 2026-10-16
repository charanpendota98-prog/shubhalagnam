"use client";

/**
 * 💎 Referral Pro — wallet statement, per-friend earnings explainer,
 * per-person invite sending, and performance insights.
 *
 * Everything on this screen comes from the member's own ledger and their own
 * invites. Numbers that have not been earned are never drawn as money, and
 * every panel says what it can and cannot prove.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLang } from "@/lib/lang";
import { apiGet, apiPost } from "@/lib/api";

type Entry = {
  id: string; at: string; type: string;
  label_en: string; label_te: string;
  amount: number; balance_after: number;
  from_name?: string; plan_code?: string; plan_amount?: string | number;
  utr?: string; note?: string;
};

type Statement = {
  wallet: number;
  entries: Entry[];
  totals: { earned: number; reversed: number; returned: number; pending_payout: number; paid_out: number; lifetime_earned: number };
  identity: { formula_en: string; formula_te: string; expected_wallet: number; actual_wallet: number; reconciles: boolean };
  min_payout: number;
  can_request_payout: boolean;
  note_en: string; note_te: string;
};

type EarningsRow = {
  tsap_id: string; name: string; stage: "rewarded" | "waiting" | "reversed" | "invited";
  reward: number; credited_at: string; joined_at: string;
  plan_code: string; plan_amount: string | number;
  why_en: string; why_te: string; next_en: string; next_te: string;
  timeline: { at: string; label_en: string; label_te: string }[];
};

type Earnings = {
  rows: EarningsRow[];
  counts: { registered: number; rewarded: number; waiting: number; reversed: number; invited_only: number };
  totals: { reward_per_friend: number; rewards_count: number; gross_earned: number; reversed: number; pending_payout: number; paid_out: number; wallet: number };
  formula_en: string; formula_te: string;
  note_en: string; note_te: string;
};

type Invite = {
  token: string; name: string; link: string; channel: string;
  stage: string; stage_en: string; stage_te: string;
  next_en: string; next_te: string;
  sent_at: string; sent_days_ago: number | null; needs_followup: boolean;
  phone_masked?: string; joined_tsap?: string; reward?: number; send_count?: number;
  message_en?: string; message_te?: string;
};

type InviteShare = { whatsapp_en: string; whatsapp_te: string; telegram_en: string; telegram_te: string; sms_en: string; sms_te: string; link: string };

type Insights = {
  channels: { channel: string; sent: number; clicked: number; joined: number; rewarded: number }[];
  best_channel: { channel: string; reason_en: string; reason_te: string } | null;
  conversion: {
    clicks: number; registrations: number; rewarded: number;
    click_to_join_pct: number | null; join_to_reward_pct: number | null;
    small_sample: boolean; sample_size_note_en: string; sample_size_note_te: string;
  };
  followups: { token: string; name: string; days: number; share: InviteShare; reason_en: string; reason_te: string }[];
  next_actions: { title_en: string; title_te: string; why_en: string; why_te: string; href: string }[];
  note_en: string; note_te: string;
};

type Panel = "wallet" | "earnings" | "sending" | "insights";

const CARD = "rounded-3xl border border-gold/30 bg-white p-4 sm:p-5 shadow-xs";
const CHIP = "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide";
const BTN = "inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 text-[12px] font-black";

const STAGE_CHIP: Record<string, string> = {
  rewarded: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  joined: "bg-sky-100 text-sky-800 border border-sky-300",
  clicked: "bg-amber-100 text-amber-800 border border-amber-300",
  sent: "bg-slate-100 text-slate-700 border border-slate-300",
  waiting: "bg-amber-100 text-amber-800 border border-amber-300",
  reversed: "bg-rose-100 text-rose-800 border border-rose-300",
  invited: "bg-indigo-100 text-indigo-800 border border-indigo-300",
};

function inr(value: number): string {
  const v = Math.round(Number(value || 0) * 100) / 100;
  return Number.isInteger(v) ? `₹${v}` : `₹${v.toFixed(2)}`;
}

function shortDate(stamp: string): string {
  return (stamp || "").slice(0, 10) || "—";
}

export default function ReferralPro({ tsapId }: { tsapId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [panel, setPanel] = useState<Panel>("wallet");

  const [statement, setStatement] = useState<Statement | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<"all" | "commission" | "payout" | "reversal">("all");

  const [form, setForm] = useState({ name: "", phone: "", channel: "whatsapp" });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    if (!tsapId) return;
    setLoading(true);
    const [w, e, i, inv] = await Promise.all([
      apiGet<Statement>(`/api/referral/${encodeURIComponent(tsapId)}/wallet?limit=200`),
      apiGet<Earnings>(`/api/referral/${encodeURIComponent(tsapId)}/earnings`),
      apiGet<Insights>(`/api/referral/${encodeURIComponent(tsapId)}/insights`),
      apiGet<{ invites?: Invite[] }>(`/api/referral/${encodeURIComponent(tsapId)}/invites?limit=100`),
    ]);
    if (w.ok && w.data) setStatement(w.data);
    if (e.ok && e.data) setEarnings(e.data);
    if (i.ok && i.data) setInsights(i.data);
    if (inv.ok && inv.data) setInvites(inv.data.invites || []);
    setLoading(false);
  }, [tsapId]);

  useEffect(() => {
    void load();
  }, [load]);

  const entries = useMemo(() => {
    const rows = statement?.entries || [];
    if (filter === "all") return rows;
    if (filter === "commission") return rows.filter((r) => r.type === "commission" || r.type === "milestone");
    if (filter === "payout") return rows.filter((r) => r.type.startsWith("payout"));
    return rows.filter((r) => r.type === "reversal");
  }, [statement, filter]);

  async function createInvite() {
    if (!form.name.trim()) {
      setNotice({ ok: false, text: te ? "ముందు పేరు ఇవ్వండి" : "Enter the name first" });
      return;
    }
    if (form.phone && !/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) {
      setNotice({ ok: false, text: te ? "ఫోన్ 10 అంకెలు ఉండాలి (లేదా ఖాళీ వదిలేయండి)" : "Phone must be 10 digits (or leave it empty)" });
      return;
    }
    setSending(true);
    setNotice(null);
    const res = await apiPost<{ invite?: Invite; message_en?: string; message_telugu?: string; reason?: string }>(
      `/api/referral/${encodeURIComponent(tsapId)}/invite`,
      { name: form.name.trim(), phone: form.phone.replace(/\D/g, ""), channel: form.channel },
    );
    setSending(false);
    if (res.ok && res.data?.invite) {
      setInvites((prev) => [res.data!.invite as Invite, ...prev.filter((i) => i.token !== res.data!.invite!.token)]);
      setForm({ name: "", phone: "", channel: form.channel });
      setNotice({ ok: true, text: (te ? res.data.message_telugu : res.data.message_en) || "" });
      void load();
    } else {
      setNotice({
        ok: false,
        text: (te ? res.data?.message_telugu : res.data?.message_en)
          || (te ? "ఆహ్వానం సృష్టించలేకపోయాం" : "The invite could not be created"),
      });
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      /* clipboard blocked — the link is still visible to copy by hand */
    }
  }

  if (!tsapId) return null;

  const totals = statement?.totals;
  const identity = statement?.identity;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {([
          { id: "wallet", label: te ? "💰 వాలెట్ స్టేట్‌మెంట్" : "💰 Wallet statement" },
          { id: "earnings", label: te ? "🧮 ఎలా లెక్కించాం" : "🧮 How it adds up" },
          { id: "sending", label: te ? "📨 పంపడం (ఒక్కొక్కరికి)" : "📨 Sending (per person)" },
          { id: "insights", label: te ? "💡 స్మార్ట్ సూచనలు" : "💡 Smart tips" },
        ] as { id: Panel; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPanel(tab.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all ${
              panel === tab.id ? "maroon-gradient text-white shadow-soft" : "bg-white text-gray-700 hover:bg-amber-50 border border-gold/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ───────────────────────── WALLET STATEMENT ───────────────────────── */}
      {panel === "wallet" && (
        <div className="space-y-3">
          <div className={CARD}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl border border-gold/25 bg-[#FFF7EC] px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8A6A1F]">
                  {te ? "వాలెట్" : "Wallet"}
                </p>
                <p className="text-2xl font-black text-[#7A0C2E]">{inr(statement?.wallet ?? 0)}</p>
              </div>
              <div className="rounded-2xl border border-gold/25 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8A6A1F]">
                  {te ? "సమీక్షలో" : "In review"}
                </p>
                <p className="text-2xl font-black text-[#8A6A1F]">{inr(totals?.pending_payout ?? 0)}</p>
              </div>
              <div className="rounded-2xl border border-gold/25 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8A6A1F]">
                  {te ? "చెల్లించినవి" : "Paid out"}
                </p>
                <p className="text-2xl font-black text-[#1F7A3D]">{inr(totals?.paid_out ?? 0)}</p>
              </div>
              <div className="rounded-2xl border border-gold/25 bg-white px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-wide text-[#8A6A1F]">
                  {te ? "మొత్తం సంపాదన" : "Lifetime"}
                </p>
                <p className="text-2xl font-black text-[#4A3B2A]">{inr(totals?.lifetime_earned ?? 0)}</p>
              </div>
            </div>

            {identity && (
              <div className={`mt-3 rounded-2xl border px-3 py-2.5 ${
                identity.reconciles ? "border-emerald-300 bg-emerald-50/60" : "border-rose-300 bg-rose-50"
              }`}>
                <p className="text-[11px] font-black text-[#4A3B2A]">
                  {identity.reconciles
                    ? (te ? "✅ ఈ లెక్క సరిపోతుంది" : "✅ This statement balances")
                    : (te ? "⚠️ ఈ లెక్క సరిపోలేదు — సహాయం అడగండి" : "⚠️ This statement does not balance — please contact support")}
                </p>
                <p className="mt-1 font-mono text-[11px] leading-relaxed text-[#6B5A46]">
                  {te ? identity.formula_te : identity.formula_en}
                </p>
              </div>
            )}
          </div>

          <div className={CARD}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-black text-[#7A0C2E]">
                {te ? "లావాదేవీలు" : "Transactions"}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { id: "all", label: te ? "అన్నీ" : "All" },
                  { id: "commission", label: te ? "రివార్డ్‌లు" : "Rewards" },
                  { id: "payout", label: te ? "పేఅవుట్‌లు" : "Payouts" },
                  { id: "reversal", label: te ? "రివర్స్" : "Reversals" },
                ] as { id: typeof filter; label: string }[]).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold border ${
                      filter === f.id
                        ? "bg-[#7A0C2E] text-white border-[#7A0C2E]"
                        : "bg-white text-[#6B5A46] border-gold/30 hover:bg-amber-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loading && !statement ? (
              <p className="mt-3 text-[12px] text-[#8A6A1F]">{te ? "లోడ్ అవుతోంది…" : "Loading…"}</p>
            ) : entries.length === 0 ? (
              <p className="mt-3 text-[12px] text-[#6B5A46]">
                {te
                  ? "ఇంకా లావాదేవీలు లేవు. ఒక స్నేహితుడు అర్హమైన ప్లాన్ చెల్లించినప్పుడు ఇక్కడ కనిపిస్తుంది."
                  : "No transactions yet. The first eligible plan payment from a friend shows up here."}
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-gold/10">
                {entries.map((row) => (
                  <li key={row.id || `${row.at}-${row.type}`} className="flex items-start justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-[#4A3B2A]">
                        {te ? row.label_te : row.label_en}
                      </p>
                      <p className="text-[11px] text-[#8A6A1F]">
                        {shortDate(row.at)}
                        {row.from_name ? ` · ${row.from_name}` : ""}
                        {row.plan_code ? ` · ${row.plan_code}` : ""}
                        {row.utr ? ` · UTR ${row.utr}` : ""}
                      </p>
                      {row.note ? <p className="text-[11px] text-[#6B5A46]">{row.note}</p> : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-[13px] font-black ${
                        row.amount > 0 ? "text-emerald-700" : row.amount < 0 ? "text-rose-700" : "text-[#6B5A46]"
                      }`}>
                        {row.amount > 0 ? "+" : ""}{inr(row.amount)}
                      </p>
                      <p className="text-[10px] text-[#8A6A1F]">
                        {te ? "బ్యాలెన్స్" : "Balance"} {inr(row.balance_after)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={`/api/referral/${encodeURIComponent(tsapId)}/wallet.csv`}
                className={`${BTN} border border-gold/40 bg-white text-[#7A0C2E] hover:bg-amber-50`}
              >
                {te ? "⬇️ CSV డౌన్‌లోడ్" : "⬇️ Download CSV"}
              </a>
              <span className="text-[10.5px] text-[#8A6A1F]">
                {te ? "స్క్రీన్ లోని అదే లెక్కలు, అదే తనిఖీతో" : "Same numbers as this screen, with the same check"}
              </span>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-[#8A6A1F]">
              {statement ? (te ? statement.note_te : statement.note_en) : ""}
            </p>
          </div>
        </div>
      )}

      {/* ───────────────────────── EARNINGS EXPLAINER ───────────────────────── */}
      {panel === "earnings" && (
        <div className="space-y-3">
          <div className={CARD}>
            <h4 className="text-sm font-black text-[#7A0C2E]">
              {te ? "మీ వాలెట్ ఎలా వచ్చింది" : "How your wallet got to this number"}
            </h4>
            <p className="mt-2 rounded-2xl border border-gold/25 bg-[#FFF7EC] px-3 py-2 font-mono text-[11.5px] leading-relaxed text-[#4A3B2A]">
              {earnings ? (te ? earnings.formula_te : earnings.formula_en) : "—"}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#6B5A46]">
              {earnings ? (te ? earnings.note_te : earnings.note_en) : ""}
            </p>
            {earnings && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {([
                  { label: te ? "రివార్డ్ పొందినవారు" : "Rewarded", value: earnings.counts.rewarded },
                  { label: te ? "వేచి ఉన్నవారు" : "Waiting", value: earnings.counts.waiting },
                  { label: te ? "రివర్స్" : "Reversed", value: earnings.counts.reversed },
                  { label: te ? "ఆహ్వానం మాత్రమే" : "Invited only", value: earnings.counts.invited_only },
                ]).map((kpi) => (
                  <div key={kpi.label} className="rounded-2xl border border-gold/25 bg-white px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-[#8A6A1F]">{kpi.label}</p>
                    <p className="text-xl font-black text-[#7A0C2E]">{kpi.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {earnings && earnings.rows.length === 0 && (
            <div className={CARD}>
              <p className="text-[12.5px] text-[#6B5A46]">
                {te
                  ? "ఇంకా ఎవరూ మీ కోడ్‌తో నమోదు కాలేదు. కింద “పంపడం” ట్యాబ్ లో ఒక్కొక్కరికి ఆహ్వానం పంపితే ఎవరు తెరిచారో, ఎవరు చేరారో ఇక్కడ కనిపిస్తుంది."
                  : "Nobody has registered with your code yet. Send one invite per person from the Sending tab and you will see exactly who opened it and who joined."}
              </p>
            </div>
          )}

          {earnings?.rows.map((row) => (
            <div key={`${row.tsap_id || row.name}-${row.stage}`} className={CARD}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[14px] font-black text-[#4A3B2A]">{row.name}</p>
                  <p className="text-[11px] text-[#8A6A1F]">
                    {row.joined_at ? `${te ? "చేరిన తేదీ" : "Joined"} ${shortDate(row.joined_at)}` : (te ? "ఇంకా చేరలేదు" : "Not joined yet")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`${CHIP} ${STAGE_CHIP[row.stage] || STAGE_CHIP.sent}`}>{row.stage}</span>
                  <span className="text-[15px] font-black text-[#7A0C2E]">{inr(row.reward)}</span>
                </div>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[#4A3B2A]">
                {te ? row.why_te : row.why_en}
              </p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[#6B5A46]">
                <b className="text-[#8A6A1F]">{te ? "తర్వాత: " : "Next: "}</b>
                {te ? row.next_te : row.next_en}
              </p>
              <ol className="mt-2 space-y-1">
                {row.timeline.map((step, idx) => (
                  <li key={`${step.label_en}-${idx}`} className="flex items-center gap-2 text-[11px] text-[#6B5A46]">
                    <span className={`h-1.5 w-1.5 rounded-full ${step.at ? "bg-emerald-500" : "bg-amber-400"}`} />
                    <span>{te ? step.label_te : step.label_en}</span>
                    <span className="text-[#8A6A1F]">{step.at ? shortDate(step.at) : ""}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      {/* ───────────────────────── SENDING (PER PERSON) ───────────────────────── */}
      {panel === "sending" && (
        <div className="space-y-3">
          <div className={CARD}>
            <h4 className="text-sm font-black text-[#7A0C2E]">
              {te ? "ఒక్కొక్కరికి ఆహ్వానం" : "One invite per person"}
            </h4>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[#6B5A46]">
              {te
                ? "పేరు ఇచ్చి ఆహ్వానం సృష్టించండి — ప్రతి ఆహ్వానానికి దాని సొంత లింక్ ఉంటుంది, కాబట్టి ఎవరు తెరిచారో, ఎవరు చేరారో మీకు కనిపిస్తుంది. మేము ఎవరికీ మీ తరపున సందేశం పంపము; మీరే పంపాలి."
                : "Create an invite with a name and it gets its own link, so you can see who opened it and who joined. We never message anyone on your behalf — you press send."}
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={te ? "స్నేహితుని పేరు" : "Friend's name"}
                aria-label={te ? "స్నేహితుని పేరు" : "Friend's name"}
                className="min-h-[44px] rounded-2xl border border-gold/30 px-3 text-[13px] outline-none focus:border-[#7A0C2E]"
              />
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={te ? "ఫోన్ (ఐచ్ఛికం)" : "Phone (optional)"}
                aria-label={te ? "ఫోన్ (ఐచ్ఛికం)" : "Phone (optional)"}
                inputMode="numeric"
                className="min-h-[44px] rounded-2xl border border-gold/30 px-3 text-[13px] outline-none focus:border-[#7A0C2E]"
              />
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                aria-label={te ? "ఎలా పంపాలి" : "How to send"}
                className="min-h-[44px] rounded-2xl border border-gold/30 px-3 text-[13px] outline-none focus:border-[#7A0C2E]"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="telegram">Telegram</option>
                <option value="sms">SMS</option>
                <option value="copy">{te ? "లింక్ కాపీ" : "Copy link"}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => void createInvite()}
              disabled={sending}
              className={`${BTN} mt-3 w-full sm:w-auto bg-[#7A0C2E] text-white hover:bg-[#5E0A23] disabled:opacity-60`}
            >
              {sending ? (te ? "సిద్ధం చేస్తున్నాం…" : "Preparing…") : (te ? "✉️ ఆహ్వానం సిద్ధం చేయి" : "✉️ Create invite")}
            </button>

            {notice && (
              <p className={`mt-2 text-[12px] ${notice.ok ? "text-emerald-700" : "text-rose-700"}`}>{notice.text}</p>
            )}
          </div>

          {invites.length === 0 ? (
            <div className={CARD}>
              <p className="text-[12.5px] text-[#6B5A46]">
                {te ? "ఇంకా ఆహ్వానాలు లేవు." : "No invites yet."}
              </p>
            </div>
          ) : (
            invites.map((inv) => {
              const shareKey = inv.token;
              // Built here rather than fetched: the message already came back
              // with the invite, and a wa.me link is just that text encoded.
              const waHref = `https://wa.me/?text=${encodeURIComponent(
                (te ? inv.message_te : inv.message_en) || inv.link,
              )}`;
              const tgHref = `https://t.me/share/url?url=${encodeURIComponent(inv.link)}&text=${encodeURIComponent(
                (te ? inv.message_te : inv.message_en) || "",
              )}`;
              return (
                <div key={inv.token} className={CARD}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[14px] font-black text-[#4A3B2A]">{inv.name}</p>
                      <p className="text-[11px] text-[#8A6A1F]">
                        {typeof inv.sent_days_ago === "number"
                          ? (te ? `${inv.sent_days_ago} రోజుల క్రితం` : `sent ${inv.sent_days_ago} day(s) ago`)
                          : shortDate(inv.sent_at)}
                        {inv.phone_masked ? ` · ${inv.phone_masked}` : ""}
                        {inv.send_count && inv.send_count > 1 ? ` · ${inv.send_count}×` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.needs_followup && (
                        <span className={`${CHIP} bg-amber-100 text-amber-800 border border-amber-300`}>
                          {te ? "మళ్లీ పంపండి" : "Follow up"}
                        </span>
                      )}
                      <span className={`${CHIP} ${STAGE_CHIP[inv.stage] || STAGE_CHIP.sent}`}>
                        {te ? inv.stage_te : inv.stage_en}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-[11.5px] leading-relaxed text-[#6B5A46]">
                    {te ? inv.next_te : inv.next_en}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`}
                      aria-label={te ? `${inv.name} కి WhatsApp లో పంపు` : `Send to ${inv.name} on WhatsApp`}
                    >
                      WhatsApp
                    </a>
                    <a
                      href={tgHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${BTN} border border-sky-300 bg-white text-sky-700 hover:bg-sky-50`}
                      aria-label={te ? `${inv.name} కి Telegram లో పంపు` : `Send to ${inv.name} on Telegram`}
                    >
                      Telegram
                    </a>
                    <button
                      type="button"
                      onClick={() => void copy(inv.link, shareKey)}
                      className={`${BTN} border border-gold/40 bg-white text-[#7A0C2E] hover:bg-amber-50`}
                    >
                      {copied === shareKey ? (te ? "✅ కాపీ అయ్యింది" : "✅ Copied") : (te ? "లింక్ కాపీ" : "Copy link")}
                    </button>
                  </div>
                  <p className="mt-2 break-all text-[10.5px] text-[#8A6A1F]">{inv.link}</p>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ───────────────────────── INSIGHTS ───────────────────────── */}
      {panel === "insights" && insights && (
        <div className="space-y-3">
          <div className={CARD}>
            <h4 className="text-sm font-black text-[#7A0C2E]">
              {te ? "మీ డేటా ఏమి చెబుతోంది" : "What your own data says"}
            </h4>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {([
                { label: te ? "క్లిక్‌లు" : "Clicks", value: insights.conversion.clicks },
                { label: te ? "నమోదులు" : "Joined", value: insights.conversion.registrations },
                { label: te ? "రివార్డ్" : "Rewarded", value: insights.conversion.rewarded },
              ]).map((kpi) => (
                <div key={kpi.label} className="rounded-2xl border border-gold/25 bg-[#FFF7EC] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#8A6A1F]">{kpi.label}</p>
                  <p className="text-xl font-black text-[#7A0C2E]">{kpi.value}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-[#6B5A46]">
              {te ? insights.conversion.sample_size_note_te : insights.conversion.sample_size_note_en}
            </p>
          </div>

          {insights.channels.length > 0 && (
            <div className={CARD}>
              <h4 className="text-sm font-black text-[#7A0C2E]">{te ? "ఛానల్ వారీగా" : "By channel"}</h4>
              <ul className="mt-2 space-y-1.5">
                {insights.channels.map((c) => (
                  <li key={c.channel} className="flex items-center justify-between gap-3 border-b border-gold/10 pb-1.5 text-[12px]">
                    <span className="font-bold capitalize text-[#4A3B2A]">{c.channel}</span>
                    <span className="text-[#6B5A46]">
                      {c.sent} {te ? "పంపారు" : "sent"} · {c.clicked} {te ? "తెరిచారు" : "opened"} · {c.joined} {te ? "చేరారు" : "joined"}
                    </span>
                  </li>
                ))}
              </ul>
              {insights.best_channel && (
                <p className="mt-2 text-[11.5px] leading-relaxed text-[#6B5A46]">
                  <b className="text-[#8A6A1F]">{te ? "బాగా పనిచేసింది: " : "Working best: "}</b>
                  {te ? insights.best_channel.reason_te : insights.best_channel.reason_en}
                </p>
              )}
            </div>
          )}

          {insights.followups.length > 0 && (
            <div className={CARD}>
              <h4 className="text-sm font-black text-[#7A0C2E]">{te ? "మళ్లీ పంపదగినవి" : "Worth a gentle re-send"}</h4>
              <ul className="mt-2 space-y-2">
                {insights.followups.map((f) => (
                  <li key={f.token} className="flex items-center justify-between gap-3 rounded-2xl border border-gold/25 bg-[#FFF7EC] px-3 py-2">
                    <div>
                      <p className="text-[12.5px] font-bold text-[#4A3B2A]">{f.name}</p>
                      <p className="text-[11px] text-[#6B5A46]">{te ? f.reason_te : f.reason_en}</p>
                    </div>
                    <a
                      href={te ? f.share.whatsapp_te : f.share.whatsapp_en}
                      className={`${BTN} bg-emerald-600 text-white hover:bg-emerald-700`}
                    >
                      {te ? "మళ్లీ పంపు" : "Re-send"}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {insights.next_actions.length > 0 && (
            <div className={CARD}>
              <h4 className="text-sm font-black text-[#7A0C2E]">{te ? "ఇప్పుడు చేయదగినవి" : "Do this next"}</h4>
              <ul className="mt-2 space-y-2">
                {insights.next_actions.map((a, idx) => (
                  <li key={`${a.title_en}-${idx}`} className="rounded-2xl border border-gold/25 bg-white px-3 py-2">
                    <p className="text-[12.5px] font-bold text-[#4A3B2A]">{te ? a.title_te : a.title_en}</p>
                    <p className="text-[11px] leading-relaxed text-[#6B5A46]">{te ? a.why_te : a.why_en}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="px-1 text-[11px] leading-relaxed text-[#8A6A1F]">
            {te ? insights.note_te : insights.note_en}
          </p>
        </div>
      )}
    </div>
  );
}
