"use client";

/**
 * MANA VIVAHA — REQUESTS DASHBOARD (💌 Interest model — chatting LEDU)
 * ====================================================================
 * • Interest pampu (1 credit; modati 3 FREE) → owner ki WhatsApp lo mee profile
 * • Inbox: vachina requests → ✅ Accept / ❌ Decline (decline = credit refund)
 * • Sent: pampina requests + status + accept ayyaka contact
 * • Plans: ₹99 → 5 profiles | ₹199 → 12 | ₹299 → 25 | ₹499 → 50 (VIP)  — add-ons + renewal tho
 * • Anti-ban WhatsApp status (queue + random gap) chupisthundi
 */
import { useCallback, useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { authHeaders, apiPost, apiGet, getToken } from "@/lib/api";
import Link from "next/link";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";

type Plan = { code: string; price: number; profiles: number; label: string; telugu: string; badge: string; per_profile: number; perks?: string[] };
type Addon = { code: string; price: number; label: string; telugu: string; kind: string };
type Saved = { saved_at: string; profile: any; porutham?: { score: number; max: number; verdict: string } | null };
type Req = {
  request_id: string; from_id: string; to_id: string; status: string; score: number;
  note?: string; reasons?: string[]; created_at?: string; credit_refunded?: boolean;
  requester?: any; profile?: any; requester_phone?: string; contact?: string; actions?: string[];
};

const PLANS_FALLBACK: Plan[] = [
  { code: "S_99", price: 99, profiles: 5, label: "Sambandham", telugu: "₹99 → 5 profiles", badge: "Entry • ₹19.8/profile", per_profile: 20 },
  { code: "S_199", price: 199, profiles: 12, label: "Family", telugu: "₹199 → 12 profiles", badge: "Most popular • ₹16.6/profile", per_profile: 17 },
  { code: "S_299", price: 299, profiles: 25, label: "Premium", telugu: "₹299 → 25 profiles", badge: "Best value • ₹12/profile", per_profile: 12 },
  { code: "S_499", price: 499, profiles: 50, label: "VIP", telugu: "₹499 → 50 profiles", badge: "VIP", per_profile: 10 },
];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-300",
  accepted: "bg-emerald-100 text-emerald-800 border-emerald-300",
  declined: "bg-rose-100 text-rose-800 border-rose-300",
  expired: "bg-gray-100 text-gray-600 border-gray-300",
  withdrawn: "bg-gray-100 text-gray-600 border-gray-300",
};

export default function RequestsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [needsLogin, setNeedsLogin] = useState(false);
  const [myId, setMyId] = useState("");
  const [tab, setTab] = useState<"inbox" | "sent" | "send" | "plans" | "porutham" | "saved" | "viewers">("inbox");
  const [credits, setCredits] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>(PLANS_FALLBACK);
  const [inbox, setInbox] = useState<any>({ received: [], pending: 0, accepted: 0, declined: 0 });
  const [sent, setSent] = useState<any>({ sent: [] });
  const [toId, setToId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [lastSend, setLastSend] = useState<any>(null);
  const [wa, setWa] = useState<any>(null);
  const [showOwnerMsg, setShowOwnerMsg] = useState(false);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [renewal, setRenewal] = useState<any>(null);
  const [saved, setSaved] = useState<{ count: number; saved: Saved[] }>({ count: 0, saved: [] });
  // 🆕 WAVE 9 ADVANCED — Telugu interest templates + consent ledger + profile strength
  const [templates, setTemplates] = useState<{ id: string; text: string; tag?: string }[]>([]);
  const [consent, setConsent] = useState<{ events?: any[]; total?: number } | null>(null);
  const [quality, setQuality] = useState<any>(null);
  const [views, setViews] = useState<any>(null);
  const [por, setPor] = useState<any>(null);
  const [porA, setPorA] = useState("");
  const [porB, setPorB] = useState("");

  // ---- load my ID (localStorage / ?id=) + plans -------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const fromUrl = sp.get("id") || "";
    const stored = window.localStorage.getItem("tsap_id") || "";
    const id = (fromUrl || stored || "").toUpperCase();
    if (id) {
      setMyId(id);
      window.localStorage.setItem("tsap_id", id);
    }
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        if (d?.plans) setPlans(d.plans.filter((p: Plan) => p.price > 0));
        if (d?.addons) setAddons(d.addons);
        if (d?.renewal) setRenewal(d.renewal);
      })
      .catch(() => {});
    fetch("/api/wa/status").then((r) => r.json()).then(setWa).catch(() => {});
  }, []);

  const refresh = useCallback(
    async (id: string) => {
      if (!id) return;
      try {
        const [c, i, s, sv, vw, tpl, cst, ql] = await Promise.all([
          fetch(`/api/credits/${id}`, { headers: authHeaders() }).then((r) => { if (r.status === 401) setNeedsLogin(true); return r.json(); }),
          fetch(`/api/interest/inbox/${id}`, { headers: authHeaders() }).then((r) => { if (r.status === 401) setNeedsLogin(true); return r.json(); }),
          fetch(`/api/interest/sent/${id}`, { headers: authHeaders() }).then((r) => { if (r.status === 401) setNeedsLogin(true); return r.json(); }),
          fetch(`/api/saved/${id}`, { headers: authHeaders() }).then((r) => { if (r.status === 401) setNeedsLogin(true); return r.json(); }),
          fetch(`/api/views/${id}`, { headers: authHeaders() }).then((r) => { if (r.status === 401) setNeedsLogin(true); return r.json(); }),
          fetch("/api/templates/interest").then((r) => r.json()).catch(() => ({})),
          fetch(`/api/consent/log/${id}`, { headers: authHeaders() }).then((r) => { if (r.status === 401) setNeedsLogin(true); return r.json(); }).catch(() => ({})),
          fetch(`/api/profile/${id}/quality`, { headers: authHeaders() }).then((r) => { if (r.status === 401) setNeedsLogin(true); return r.json(); }).catch(() => ({})),
        ]);
        if (typeof c?.credits === "number") setCredits(c.credits);
        if (i?.received) setInbox(i);
        if (s?.sent) setSent(s);
        if (sv?.saved) setSaved({ count: sv.count, saved: sv.saved });
        if (vw?.tsap_id) setViews(vw);
        if (Array.isArray(tpl?.templates)) setTemplates(tpl.templates);
        if (cst?.tsap_id) setConsent(cst);
        if (ql?.tsap_id || ql?.completeness) setQuality(ql);
      } catch {
        setToast({ kind: "err", text: te ? "Server తో connect అవ్వలేదు — మళ్లీ try చెయ్యండి" : "Could not connect to server — retry" });
      }
    },
    []
  );

  useEffect(() => {
    if (myId) refresh(myId);
  }, [myId, refresh]);

  const saveId = (v: string) => {
    const id = v.trim().toUpperCase();
    setMyId(id);
    if (typeof window !== "undefined" && id) window.localStorage.setItem("tsap_id", id);
    if (id) refresh(id);
  };

  const sendInterest = async () => {
    if (!myId) return setToast({ kind: "err", text: te ? "ముందు మీ Profile ID ఇవ్వండి (register చేశాక వస్తుంది)" : "Enter your Profile ID first (you get it after register)" });
    if (!toId.trim()) return setToast({ kind: "err", text: te ? "ఏ profile కి పంపాలి — Profile ID type చెయ్యండి" : "Which profile to send to — type the Profile ID" });
    setBusy(true);
    setToast(null);
    try {
      const r = await fetch("/api/interest/send", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ from_id: myId, to_id: toId.trim().toUpperCase(), note }),
      });
      const d = await r.json();
      if (r.status === 402) {
        setToast({ kind: "err", text: d.message_telugu || "Credits ledu" });
        setTab("plans");
        setCredits(0);
      } else if (!r.ok) {
        setToast({ kind: "err", text: d.message_telugu || d.detail || (te ? "Request fail అయ్యింది" : "Request failed") });
      } else {
        setLastSend(d);
        setToast({ kind: "ok", text: d.message_telugu });
        setNote("");
        setCredits(d.credits_left);
        refresh(myId);
      }
    } catch {
      setToast({ kind: "err", text: te ? "Network problem — మళ్లీ try చెయ్యండి" : "Network problem — retry" });
    }
    setBusy(false);
  };

  const respond = async (request_id: string, action: string) => {
    setBusy(true);
    try {
      const r = await fetch("/api/interest/respond", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tsap_id: myId, request_id, action }),
      });
      const d = await r.json();
      setToast({ kind: r.ok ? "ok" : "err", text: d.message_telugu || d.detail || d.message });
      refresh(myId);
    } catch {
      setToast({ kind: "err", text: "Network problem" });
    }
    setBusy(false);
  };

  const buy = async (plan: string) => {
    setBusy(true);
    try {
      const r = await fetch("/api/credits/buy", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tsap_id: myId, plan }),
      });
      const d = await r.json();
      if (r.ok) {
        setCredits(d.credits_now);
        setToast({ kind: "ok", text: d.message_telugu });
        if (d.upi_link) window.open(d.upi_link, "_blank");
      } else setToast({ kind: "err", text: d.detail || (te ? "Payment start అవ్వలేదు" : "Payment did not start") });
    } catch {
      setToast({ kind: "err", text: "Network problem" });
    }
    setBusy(false);
  };

  const checkPorutham = async () => {
    if (!porA || !porB) return setToast({ kind: "err", text: te ? "రెండు Profile ID ఇవ్వండి (bride + groom)" : "Enter both Profile IDs (bride + groom)" });
    setBusy(true);
    try {
      const d = await fetch(`/api/porutham?bride=${porA.trim().toUpperCase()}&groom=${porB.trim().toUpperCase()}`).then((r) => r.json());
      setPor(d);
      setToast({ kind: d.available ? "ok" : "info", text: d.available ? `🔮 గుణమేళనం ${d.score}/10 — ${d.verdict}` : d.reason });
    } catch {
      setToast({ kind: "err", text: te ? "గుణమేళనం లెక్కింపు విఫలమైంది" : "Porutham check failed" });
    }
    setBusy(false);
  };

  const removeSaved = async (id: string) => {
    await fetch("/api/save", { method: "POST", headers: authHeaders(),
      body: JSON.stringify({ tsap_id: myId, saved_id: id }) });
    refresh(myId);
  };

  const chip = (s: string) => {
    const cls = STATUS_STYLE[s] || "bg-gray-100 text-gray-600 border-gray-300";
    const label =
      s === "pending"
        ? te ? "⏳ పరిశీలనలో ఉంది (Pending)" : "⏳ Pending"
        : s === "accepted"
        ? te ? "🎉 ఆమోదించబడింది (Accepted)" : "🎉 Accepted"
        : s === "declined"
        ? te ? "ℹ️ ముగిసింది (100% రీఫండ్)" : "ℹ️ Declined (Refunded)"
        : s === "expired"
        ? te ? "⏳ గడువు ముగిసింది" : "⏳ Expired"
        : s.toUpperCase();
    return <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}>{label}</span>;
  };

  return (
    <main className="min-h-screen pb-36">
      {/* HERO */}
      <section className="maroon-gradient text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <Reveal>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-[11px] font-bold">
              {te ? "🚫 Chatting లేదు • 💌 Interest request • ✅ Safe WhatsApp delivery" : "🚫 No chatting • 💌 Interest request • ✅ Safe WhatsApp delivery"}
            </div>
            <h1 className="mt-3 text-2xl md:text-4xl font-bold"><Duo en="Requests Dashboard" te="రిక్వెస్ట్‌ల డాష్‌బోర్డ్" /></h1>
            <p className="mt-2 text-[13px] md:text-sm opacity-90 telugu max-w-3xl">
{te ? <>నచ్చిన ప్రొఫైల్‌కు <b>Interest పంపండి</b> — వారి అధికారిక WhatsApp కు మీ బయోడేటా కార్డ్ వెళ్తుంది.
              వారు <b>అంగీకరించిన వెంటనే</b> ఇరు కుటుంబాల నంబర్లు సురక్షితంగా మార్పిడి అవుతాయి. ఒకవేళ <b>తిరస్కరిస్తే</b> మీ క్రెడిట్ తిరిగి రీఫండ్ అవుతుంది.
              అనవసరపు స్పామ్ కాల్స్ మరియు అవాంఛిత సందేశాలు లేకుండా సంపూర్ణ గోప్యత లభిస్తుంది.</> : <>Send <b>Interest</b> to profiles you like — your verified biodata card reaches them on WhatsApp.
              When they <b>Accept</b>, verified contact numbers are securely exchanged. On <b>Decline</b>, your credit is immediately refunded.
              100% spam-free, private, and dignified matchmaking.</>}
            </p>
          </Reveal>

          <div className="mt-5 flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold opacity-90">{te ? "మీ Profile ID" : "Your Profile ID"}</label>
              <input
                value={myId}
                onChange={(e) => setMyId(e.target.value.toUpperCase())}
                onBlur={(e) => saveId(e.target.value)}
                placeholder="RED001"
                className="mt-1 w-full max-w-[224px] sm:w-56 px-3 py-2 rounded-xl text-ink font-mono text-sm outline-none focus-brand" aria-label="KAM001" />
            </div>
            <button onClick={() => saveId(myId)} className="gold-gradient text-maroon font-bold text-sm px-4 py-2.5 rounded-xl hover-lift">
              {te ? "నా dashboard చూడు" : "Load my dashboard"}
            </button>
            <div className="ml-auto bg-white/10 border border-white/20 rounded-xl px-4 py-2">
              <div className="text-[10px] opacity-80">Credits</div>
              <div className="font-bold text-lg leading-none">{credits === null ? "—" : credits}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {toast && (
          <div
            className={`mb-4 rounded-2xl px-4 py-3 text-[13px] border card-shadow ${
              toast.kind === "ok"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : toast.kind === "err"
                ? "bg-rose-50 border-rose-200 text-rose-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* TABS */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { k: "inbox", l: te ? `📥 వచ్చిన requests${inbox.pending ? ` (${inbox.pending})` : ""}` : `📥 Received${inbox.pending ? ` (${inbox.pending})` : ""}` },
            { k: "sent", l: te ? `📤 పంపిన requests${sent.sent?.length ? ` (${sent.sent.length})` : ""}` : `📤 Sent${sent.sent?.length ? ` (${sent.sent.length})` : ""}` },
            { k: "send", l: te ? "💌 Interest పంపు" : "💌 Send interest" },
            { k: "porutham", l: te ? "🔮 గుణమేళనం" : "🔮 Gunamelanam" },
            { k: "saved", l: `❤️ Saved${saved.count ? ` (${saved.count})` : ""}` },
            { k: "viewers", l: `👀 Viewers${views?.total_views ? ` (${views.total_views})` : ""}` },
            { k: "plans", l: "💳 Plans & Credits" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`px-4 py-2 rounded-xl text-[13px] font-bold border transition ${
                tab === t.k ? "bg-maroon text-white border-maroon" : "bg-white text-maroon border-maroon/20 hover-lift"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* INBOX */}
        {tab === "inbox" && (
          <div className="space-y-3">
            {!myId && <Empty text={te ? "మీ Profile ID ఇవ్వండి — inbox చూడటానికి." : "Enter your Profile ID — to see inbox."} />}
            {myId && inbox.received?.length === 0 && <Empty text={te ? "ఇంకా requests రాలేదు. మీ profile ని 1 channel లో post చెయ్యండి — reach పెరుగుతుంది." : "No requests yet. Post your profile to 1 channel — reach grows."} />}
            {inbox.received?.map((it: Req) => (
              <Reveal key={it.request_id}>
                <div className="bg-white rounded-2xl p-4 card-shadow border border-gold/20">
                  <div className="flex flex-wrap items-center gap-2">
                    {chip(it.status)}
                    <span className="text-[11px] text-gray-500 font-mono">{it.request_id}</span>
                    {it.score > 0 && <span className="text-[11px] font-bold text-maroon">⭐ {it.score}% match</span>}
                    {(it as any).porutham_score ? (
                      <span className="text-[11px] font-bold text-amber-700">🔮 గుణమేళనం {(it as any).porutham_score}/10</span>
                    ) : null}
                    <span className="ml-auto text-[11px] text-gray-500">{it.requester_phone}</span>
                  </div>
                  <div className="mt-2 grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="font-bold text-[15px] text-maroon">{it.requester?.full_name} ({it.requester?.age}y)</div>
                      <div className="text-[12px] text-gray-600 mt-1 leading-relaxed">
                        🆔 {it.from_id}{it.requester?.verified ? " ✅" : ""}<br />
                        🎓 {it.requester?.education} {it.requester?.education_detail}<br />
                        💼 {it.requester?.job} {it.requester?.company}<br />
                        💰 {it.requester?.salary} • 📏 {it.requester?.height}<br />
                        📍 {it.requester?.district}, {it.requester?.state}<br />
                        💍 {it.requester?.caste} {it.requester?.gothram ? `• Gothram ${it.requester?.gothram}` : ""}<br />
                        🌟 {it.requester?.star || "—"} • Rasi {it.requester?.rasi || "—"}
                      </div>
                      {it.note ? <div className="mt-2 text-[12px] bg-cream border border-gold/30 rounded-xl p-2">📝 &ldquo;{it.note}&rdquo;</div> : null}
                    </div>
                    <div>
                      {it.reasons?.length ? (
                        <div className="text-[12px] text-gray-700">
                          <div className="font-bold text-maroon mb-1">Enduku match avutaru:</div>
                          {it.reasons.slice(0, 4).map((r) => (
                            <div key={r}>✅ {r}</div>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {it.actions?.includes("accept") ? (
                          <>
                            <button onClick={() => respond(it.request_id, "accept")} disabled={busy} className="bg-emerald-600 text-white font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5">
                              <span>✅</span> {te ? "ఆమోదించు (Accept & Share Number)" : "Accept & Share Number"}
                            </button>
                            <button onClick={() => respond(it.request_id, "decline")} disabled={busy} className="bg-white border border-rose-300 text-rose-700 font-bold text-[13px] px-4 py-2.5 rounded-xl hover:bg-rose-50 transition">
                              <span>❌</span> {te ? "తిరస్కరించు (Decline & 100% Refund)" : "Decline (100% Refund)"}
                            </button>
                          </>
                        ) : it.status === "accepted" ? (
                          <div className="text-[12px] bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-900 font-semibold flex items-center gap-2">
                            <span>🎉</span> {te ? "ఆమోదించబడింది — ఫోన్ నంబర్:" : "Accepted — Phone:"} <b className="text-emerald-800 text-[13px]">{it.requester_phone}</b> {te ? "(వాట్సాప్‌లో కూడా పంపబడింది)" : "(Delivered on WhatsApp)"}
                          </div>
                        ) : (
                          <div className="text-[12px] text-gray-500 italic py-1">
                            {it.status === "declined" ? (te ? "ℹ️ ఈ సంబంధం ప్రస్తుతానికి తిరస్కరించబడింది (క్రెడిట్ రీఫండ్ అయింది)" : "ℹ️ Declined (Sender credit refunded)") : `Ee request ${it.status}`}
                          </div>
                        )}
                        <Link href={`/search/${it.from_id}`} className="text-[13px] font-bold text-maroon hover:underline px-2 py-2 flex items-center">
                          {te ? "పూర్తి ప్రొఫైల్ చూడండి →" : "View Full Profile →"}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {/* SENT */}
        {tab === "sent" && (
          <div className="space-y-3">
            {myId && sent.sent?.length === 0 && <Empty text={te ? "ఇంకా ఎవరికీ interest పంపలేదు — 💌 'Interest పంపు' tab లో start చెయ్యండి." : "No interest sent yet — start in the 💌 'Send interest' tab."} />}
            {sent.sent?.map((it: Req) => (
              <Reveal key={it.request_id}>
                <div className="bg-white rounded-2xl p-4 card-shadow border border-gold/20 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {chip(it.status)}
                      <span className="font-bold text-[14px] text-maroon">{it.profile?.full_name} ({it.profile?.age}y)</span>
                      <span className="text-[11px] text-gray-500 font-mono">{it.to_id}</span>
                      {it.score > 0 && <span className="text-[11px] font-bold">⭐ {it.score}%</span>}
                      {it.credit_refunded && <span className="text-[10px] font-bold text-emerald-700">↩️ 100% Refund</span>}
                    </div>
                    <div className="text-[12px] text-gray-600 mt-1">
                      🎓 {it.profile?.education} • 💼 {it.profile?.job} • 📍 {it.profile?.district}, {it.profile?.state} • 💍 {it.profile?.caste}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500">Contact</div>
                    <div className={`text-[13px] font-bold ${it.status === "accepted" ? "text-emerald-700" : "text-gray-400"}`}>{it.contact}</div>
                  </div>
                  <Link href={`/search/${it.to_id}`} className="text-[12px] font-bold text-maroon underline">
                    Profile →
                  </Link>
                  <TrackRequest requestId={it.request_id} />
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {/* SEND */}
        {tab === "send" && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 card-shadow border border-gold/20">
              <SectionHeading eyebrow={duo("1 credit = 1 profile", "1 క్రెడిట్ = 1 ప్రొఫైల్")} title={`💌 ${duo("Send interest", "ఇంట్రెస్ట్ పంపండి")}`} subtitle={te ? "Profile ID ఇవ్వండి — వాళ్లకి మన WhatsApp నుంచి మీ profile + card వెళ్తుంది." : "Enter profile ID — they get your profile + card from our WhatsApp."} telugu align="left" />
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[12px] font-bold text-ink">Profile ID *</label>
                  <input
                    value={toId}
                    onChange={(e) => setToId(e.target.value.toUpperCase())}
                    placeholder="RED001"
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gold/40 font-mono text-sm outline-none focus-brand" aria-label="RED001" />
                </div>
                {templates.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-ink">{te ? "💬 Ready-made Telugu messages (tap చేసి edit చెయ్యండి)" : "💬 Ready-made Telugu messages (tap to edit)"}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {templates.slice(0, 6).map((t) => (
                        <button key={t.id} type="button" onClick={() => setNote(t.text.slice(0, 280))}
                          className="rounded-full border border-gold/40 bg-cream px-2.5 py-1 text-[10px] font-semibold text-maroon hover:bg-gold/20"
                          title={t.text}>
                          {t.tag || t.id}: {t.text.slice(0, 22)}…
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[12px] font-bold text-ink">{te ? "చిన్న message (optional)" : "Short message (optional)"}</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 280))}
                    rows={3}
                    placeholder={te ? "మీ profile చాలా బాగుంది — మన family values match అవుతున్నాయి. మాట్లాడుకోవచ్చు." : "Your profile looks good — our family values match. Let\u2019s talk."}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gold/40 text-sm outline-none focus-brand" aria-label="Text area" />
                  <div className="text-[10px] text-gray-500 mt-1">{note.length}/280 • {te ? "number/email పెట్టకు (privacy policy)" : "no number/email (privacy policy)"}</div>
                </div>
                <button onClick={sendInterest} disabled={busy} className="w-full maroon-gradient text-white font-bold py-3 rounded-xl hover-lift disabled:opacity-60">
                  {busy ? (te ? "పంపిస్తున్నాం…" : "Sending…") : te ? "💌 Interest పంపు" : "💌 Send interest"}
                </button>
                <div className="text-[11px] text-gray-500">
                  Credits: <b>{credits === null ? "—" : credits}</b> • {te ? "మొదటి 3 requests FREE • Decline అయితే refund" : "First 3 requests FREE • Refund on decline"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {lastSend ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="font-bold text-emerald-900">{te ? <>✅ {lastSend.request_id} పంపించారు</> : <>✅ {lastSend.request_id} sent</>}</div>
                  <div className="text-[12px] text-emerald-900 mt-1">
                    ⭐ {lastSend.score}% match • ⏳ {lastSend.expires_in_days} {te ? "days valid • credits మిగిలాయి" : "days valid • credits left"} <b>{lastSend.credits_left}</b>
                  </div>
                  <div className="text-[12px] text-emerald-900 mt-2">
                    📲 WhatsApp: {lastSend.whatsapp?.owner_queued ? (te ? "వాళ్లకి పంపాం" : "sent to them") : (te ? "పంపలేదు" : "not sent")}
                  </div>
                  <button onClick={() => setShowOwnerMsg(!showOwnerMsg)} className="mt-3 text-[12px] font-bold text-emerald-800 underline">
                    {showOwnerMsg ? (te ? "Message దాచి పెట్టు" : "Hide message") : (te ? "వాళ్లకి వెళ్లే message చూడు (preview)" : "Preview their message")}
                  </button>
                  {showOwnerMsg && (
                    <pre className="mt-2 text-[11px] whitespace-pre-wrap bg-white border border-emerald-200 rounded-xl p-3 max-h-72 overflow-auto">{lastSend.owner_message_preview}</pre>
                  )}
                </div>
              ) : (
                <div className="bg-cream border border-gold/30 rounded-2xl p-5">
                  <div className="font-bold text-maroon">{te ? "ఎలా పని చేస్తుంది?" : "How it works?"}</div>
                  <ol className="mt-2 text-[12px] text-gray-700 space-y-1 list-decimal list-inside">
                    <li>{te ? "మీ ID + వాళ్ల ID ఇవ్వండి → request పంపిస్తాం (1 credit)" : "Enter your ID + their ID → we send request (1 credit)"}</li>
                    <li>{te ? "వాళ్లకి మన WhatsApp నుంచి మీ profile card + details" : "They get your profile card + details from our WhatsApp"}</li>
                    <li>{te ? "వాళ్లు Accept చేస్తే — రెండు numbers automatic గా WhatsApp లో" : "If they Accept — both numbers automatically on WhatsApp"}</li>
                    <li>{te ? "Decline/expire అయితే — మీ credit refund (expire కి కూడా)" : "On decline/expire — your credit refunds (expire too)"}</li>
                  </ol>
                  <div className="mt-3 text-[11px] text-gray-600">{te ? "🚫 Chatting లేదు — consent-based contact exchange మాత్రమే. Fake ids, spam calls block." : "🚫 No chatting — consent-based contact exchange only. Fake ids, spam calls blocked."}</div>
                </div>
              )}

              {quality && (
                <div className="bg-white border border-gold/30 rounded-2xl p-4">
                  <div className="font-bold text-maroon text-[13px]">{te ? "📝 మీ profile strength:" : "📝 Your profile strength:"} {quality.completeness?.percent ?? "—"}%</div>
                  <div className="mt-1 text-[11px] text-gray-600">{quality.grade_telugu || quality.completeness?.verdict_telugu || ""}</div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-2 gold-gradient" style={{ width: `${Math.min(100, Number(quality.completeness?.percent ?? 0))}%` }} />
                  </div>
                  {Array.isArray(quality.completeness?.important_telugu) && quality.completeness.important_telugu.length > 0 && (
                    <ul className="mt-2 text-[11px] text-gray-700 list-disc list-inside space-y-0.5">
                      {quality.completeness.important_telugu.slice(0, 3).map((t: string, i: number) => <li key={i}>{t}</li>)}
                    </ul>
                  )}

                  {quality.trust && (
                    <div className="mt-2 text-[11px] text-emerald-800">
                      🛡️ Trust score: <b>{quality.trust.score}</b>/100 • {quality.trust.badge_telugu}
                    </div>
                  )}
                  {quality.photo_tip_telugu && <div className="mt-1 text-[11px] text-gray-600">📷 {quality.photo_tip_telugu}</div>}
                </div>
              )}

              {consent && (
                <div className="bg-white border border-emerald-200 rounded-2xl p-4">
                  <div className="font-bold text-emerald-900 text-[13px]">🔐 {te ? "మీ నంబర్ ఎవరికి వెళ్లింది" : "Who your number was shared with"}</div>
                  <div className="mt-1 text-[11px] text-emerald-800">
                    {te ? <>మీ number ఎప్పుడు ఎవరికి ఇచ్చారో ఇక్కడ కనిపిస్తుంది — {consent.total ?? 0} సార్లు.</> : <>See when your number was shared — {consent.total ?? 0} times.</>}
                  </div>
                  {Array.isArray(consent.events) && consent.events.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {consent.events.slice(0, 5).map((e: any, i: number) => (
                        <li key={i} className="text-[11px] text-gray-700 border-l-2 border-emerald-300 pl-2">
                          {String(e.with || e.other_id || "").slice(0, 18)} • {String(e.at || "").slice(0, 16)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 text-[11px] text-gray-600">{te ? "ఇంకా number exchange లేదు — interest accept అయితే ఇక్కడ కనిపిస్తుంది." : "No number exchanged yet — appears here after an interest is accepted."}</div>
                  )}
                </div>
              )}

              {wa?.queued != null && Number(wa.queued) > 0 && (
                <div className="bg-navy text-white rounded-2xl p-4">
                  <div className="font-bold text-[13px]">📲 {te ? "WhatsApp లో పంపుతున్నాం" : "Sending on WhatsApp"}</div>
                  <div className="text-[11px] opacity-90 mt-1">{te ? `${wa.queued} messages త్వరలో వెళ్తాయి.` : `${wa.queued} messages going out shortly.`}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PORUTHAM TOOL */}
        {tab === "porutham" && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl p-5 card-shadow border border-gold/20">
              <SectionHeading eyebrow={duo("Traditional Vedic factors", "సాంప్రదాయ వేద గుణమేళనం")} title={`🔮 ${duo("Kundli / Gunamelanam check", "జాతక గుణమేళనం & పొంతన")}`}
                subtitle={te ? "వధూవరుల ప్రొఫైల్ ID ఇవ్వండి — రాశి, నక్షత్ర, గణ, యోని, రజ్జు, వేధ, మాహేంద్ర, స్త్రీదీర్ఘ, వశ్య, రాశ్యాధిపతి గుణమేళనం లెక్కిస్తాం." : "Enter bride + groom Profile IDs — we calculate 10 Vedic Gunamelanam factors (rasi, nakshatra, gana, yoni, rajju, vedha, mahendra, stree deergha, vashya, adhipathi)."} telugu align="left" />
              <div className="mt-4 space-y-3">
                <input value={porA} onChange={(e) => setPorA(e.target.value.toUpperCase())} placeholder="Bride Profile ID — RED001"
                  className="w-full px-3 py-2.5 rounded-xl border border-gold/40 font-mono text-sm outline-none focus-brand" aria-label="Bride Profile ID — RED001" />
                <input value={porB} onChange={(e) => setPorB(e.target.value.toUpperCase())} placeholder="Groom Profile ID — KAM001"
                  className="w-full px-3 py-2.5 rounded-xl border border-gold/40 font-mono text-sm outline-none focus-brand" aria-label="Groom Profile ID — KAM001" />
                <button onClick={checkPorutham} disabled={busy} className="w-full maroon-gradient text-white font-bold py-3 rounded-xl hover-lift disabled:opacity-60">
                  {te ? "🔮 గుణమేళనం లెక్కించు" : "🔮 Calculate Gunamelanam"}
                </button>
                <div className="text-[11px] text-gray-500">{te ? "ఇది traditional tables బట్టి software estimate — final గా purohit/panchangam తో confirm చెయ్యండి." : "Software estimate from traditional tables — confirm finally with purohit/panchangam."}</div>
              </div>
            </div>
            <div className="space-y-3">
              {por ? (
                <div className="bg-white rounded-2xl p-5 card-shadow border border-gold/30">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-bold text-maroon">{por.score}<span className="text-sm text-gray-400">/{por.max_score || 10}</span></div>
                    <div>
                      <div className="font-bold text-[14px] text-maroon">{por.verdict}</div>
                      <div className="text-[11px] text-gray-500">
                        {por.bride_star || por.bride?.star} ↔ {por.groom_star || por.groom?.star} • {por.bride_rasi} ↔ {por.groom_rasi}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {(por.items || []).map((x: any) => (
                      <div key={x.no} className="text-[12px] flex gap-2">
                        <span>{x.pass ? "✅" : "❌"}</span>
                        <span className="font-bold text-ink w-40 shrink-0">{x.name}</span>
                        <span className="text-gray-600">{x.note}</span>
                      </div>
                    ))}
                  </div>
                  {por.doshas?.length ? (
                    <div className="mt-3 text-[12px] bg-rose-50 border border-rose-200 text-rose-800 rounded-xl px-3 py-2">
                      {te ? <>⚠️ Critical: {por.doshas.join(", ")} — పెద్దలు + పురోహితులతో discuss చెయ్యండి</> : <>⚠️ Critical: {por.doshas.join(", ")} — discuss with elders + purohit</>}
                    </div>
                  ) : null}
                  <div className="mt-3 text-[11px] text-gray-500">{por.advice_telugu}</div>
                </div>
              ) : (
                <div className="bg-cream border border-gold/30 rounded-2xl p-5">
                  <div className="font-bold text-maroon">{te ? "వేద గుణమేళన అంశాలు ఏంటి?" : "What are Gunamelanam factors?"}</div>
                  <ol className="mt-2 text-[12px] text-gray-700 space-y-1 list-decimal list-inside">
                    <li>రాశి పొంతన (Rasi Pontana - 6/8 dosham check)</li>
                    <li>నక్షత్ర పొంతన (Nakshatra Pontana)</li>
                    <li>గణ మైత్రి (Gana Maitri - Deva/Manushya/Rakshasa)</li>
                    <li>యోని పొంతన (Yoni Pontana - animal symbols)</li>
                    <li>రజ్జు బలం (Rajju Balam ⚠️ critical)</li>
                    <li>వేధ విశ్లేషణ (Vedha check ⚠️ critical)</li>
                    <li>మాహేంద్ర పొంతన (Mahendra Pontana)</li>
                    <li>స్త్రీదీర్ఘ బలం (Stree deergha)</li>
                    <li>వశ్య పొంతన (Vashya Pontana)</li>
                    <li>రాశ్యాధిపతి మైత్రి (Rasi adhipathi)</li>
                  </ol>
                  <div className="mt-3 text-[11px] text-gray-600">{te ? <>మీ profile లో <b>Star (Nakshatram)</b> + <b>Rasi</b> fill చేసి ఉంటే automatic గా వస్తుంది.</> : <>If <b>Star (Nakshatram)</b> + <b>Rasi</b> are filled in your profile, it comes automatically.</>}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SAVED / SHORTLIST */}
        {tab === "saved" && (
          <div className="space-y-3">
            {saved.count === 0 && <Empty text={te ? "ఇంకా ఏమీ save చెయ్యలేదు — /matches లో ❤️ button press చెయ్యండి." : "Nothing saved yet — press the ❤️ button in /matches."} />}
            {saved.saved.map((x: Saved) => (
              <Reveal key={x.profile.tsap_id}>
                <div className="bg-white rounded-2xl p-4 card-shadow border border-gold/20 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[14px] text-maroon">
                      ❤️ {x.profile.full_name} ({x.profile.age}y)
                      <span className="ml-2 text-[11px] text-gray-500 font-mono">{x.profile.tsap_id}</span>
                    </div>
                    <div className="text-[12px] text-gray-600 mt-1">
                      🎓 {x.profile.education} • 💼 {x.profile.job} • 📍 {x.profile.district}, {x.profile.state} • 💍 {x.profile.caste}
                    </div>
                    {x.porutham ? (
                      <div className="text-[12px] font-bold text-amber-700 mt-1">🔮 గుణమేళనం {x.porutham.score}/{x.porutham.max} — {x.porutham.verdict?.split("—")[0]}</div>
                    ) : null}
                  </div>
                  <button onClick={() => { setToId(x.profile.tsap_id); setTab("send"); }} className="text-[12px] font-bold maroon-gradient text-white px-3 py-2 rounded-xl">
                    {te ? "💌 Interest పంపు" : "💌 Send interest"}
                  </button>
                  <Link href={`/search/${x.profile.tsap_id}`} className="text-[12px] font-bold text-maroon underline">Profile →</Link>
                  <button onClick={() => removeSaved(x.profile.tsap_id)} className="text-[12px] text-gray-500 underline">Remove</button>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {/* VIEWERS */}
        {tab === "viewers" && (
          <div className="space-y-3">
            {!views ? <Empty text={te ? "మీ Profile ID load చెయ్యండి — viewers చూడటానికి." : "Load your Profile ID — to see viewers."} /> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[["👀 Total views", views.total_views], ["🧑 Unique viewers", views.unique_viewers],
                    ["📅 Today", views.today], ["🔓 Who-viewed", views.whoviewed_unlocked ? "Unlocked ✅" : "Locked 🔒"]].map(([l, v]) => (
                    <div key={String(l)} className="bg-white rounded-2xl p-4 card-shadow border border-gold/20">
                      <div className="text-[11px] text-gray-500">{l}</div>
                      <div className="text-xl font-bold text-maroon">{v as any}</div>
                    </div>
                  ))}
                </div>
                {!views.whoviewed_unlocked && (
                  <div className="bg-cream border border-gold/30 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                    <div className="text-[13px] text-gray-700 flex-1">
                      {te ? <>🔒 ఎవరు చూశారో names చూడాలంటే <b>₹49</b> (30 days) — లేదా ₹299+ plan లో free గా వస్తుంది.</> : <>🔒 To see viewer names <b>₹49</b> (30 days) — or free with ₹299+ plan.</>}
                    </div>
                    <button onClick={() => buy("WHOVIEWED_49")} className="gold-gradient text-maroon font-bold text-[12px] px-4 py-2 rounded-xl">₹49 unlock</button>
                  </div>
                )}
                <div className="bg-white rounded-2xl p-4 card-shadow border border-gold/20">
                  {(views.viewers?.length ? views.viewers : views.viewers_masked || []).map((v: any, i: number) => (
                    <div key={i} className="text-[12px] py-1.5 border-b last:border-0 border-gray-100 flex flex-wrap gap-3">
                      <span className="font-bold text-maroon">{v.full_name || "🔒 Hidden member"}</span>
                      <span className="text-gray-600">{v.caste} • {v.district} • {v.age}y</span>
                      {v.tsap_id ? <Link href={`/search/${v.tsap_id}`} className="text-maroon underline">profile →</Link> : null}
                    </div>
                  ))}
                  {!(views.viewers?.length || views.viewers_masked?.length) && (
                    <div className="text-[12px] text-gray-500">{te ? "ఇంకా ఎవరూ చూడలేదు — మీ profile ని ఒక channel లో boost చెయ్యండి (₹49)." : "No viewers yet — boost your profile in a channel (₹49)."}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* PLANS */}
        {tab === "plans" && (
          <div>
            <SectionHeading eyebrow={duo("Credits", "క్రెడిట్లు")} title={duo("Plans — 1 credit = 1 profile", "ప్లాన్లు — 1 క్రెడిట్ = 1 ప్రొఫైల్")} subtitle={te ? "₹/profile ప్రతి tier లో తగ్గుతుంది (₹20 → ₹10). Decline అయితే credit refund. Razorpay live అయ్యాక automatic — ఇప్పుడు UPI link తో." : "₹/profile drops every tier (₹20 → ₹10). Credit refund on decline. Automatic after Razorpay live — UPI link now."} telugu align="left" />
            {renewal && (
              <div className="mt-3 rounded-2xl bg-cream border border-gold/30 p-3 text-[12px] text-gray-700">
                {te ? <>🔁 <b>Renewal offer (పాత customers):</b> ₹{renewal.price} → <b>{renewal.profiles} profiles</b> — first-time ₹99 → 5 profiles.</> : <>🔁 <b>Renewal offer (old customers):</b> ₹{renewal.price} → <b>{renewal.profiles} profiles</b> — first-time ₹99 → 5 profiles.</>}
                <button onClick={() => buy(renewal.code)} className="ml-2 text-maroon font-bold underline">{te ? "renew చెయ్" : "renew"}</button>
              </div>
            )}
            <div className="mt-4 grid md:grid-cols-3 gap-4">
              {plans.map((p, i) => (
                <Reveal key={p.code} delay={i * 80}>
                  <div className={`bg-white rounded-2xl p-5 card-shadow border h-full ${p.code === "S_299" ? "border-gold" : "border-gold/20"}`}>
                    {p.badge && <div className="text-[10px] font-bold text-gold-deep tracking-widest uppercase">{p.badge}</div>}
                    <div className="text-2xl font-bold text-maroon mt-1">₹{p.price}</div>
                    <div className="font-bold text-[14px] text-ink">{p.profiles} profiles</div>
                    <div className="text-[11px] text-gray-500">₹{p.per_profile}/profile • {p.label}</div>
                    <ul className="mt-3 text-[12px] text-gray-700 space-y-1">
                      {(p.perks || (te ? [`${p.profiles} interest requests`, "WhatsApp లో profile share", "Accept అయితే number exchange", "Decline అయితే refund"] : [`${p.profiles} interest requests`, "Profile share on WhatsApp", "Number exchange on accept", "Refund on decline"])).map((x: string) => (
                        <li key={x}>✅ {x}</li>
                      ))}
                    </ul>
                    <button
                      onClick={() => buy(p.code)}
                      disabled={busy || !myId}
                      className="mt-4 w-full gold-gradient text-maroon font-bold py-2.5 rounded-xl hover-lift disabled:opacity-50"
                    >
                      {myId ? `₹${p.price} pay → ${p.profiles} profiles` : te ? "మీ Profile ID ఇవ్వండి" : "Enter your Profile ID"}
                    </button>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-4 text-[12px] text-gray-600 bg-cream border border-gold/30 rounded-2xl p-4">
{te ? <>💡 <b>Free plan:</b> register చెయ్యగానే 3 interest requests FREE. <b>Referral:</b> friend ని పిలిచి వాళ్లు ₹99 pay చేస్తే మీకు ₹50 + వాళ్లకి extra credit. <b>Bureau/agents:</b> ₹999/mo → 25 profiles + monthly report.</> : <>💡 <b>Free plan:</b> 3 interest requests FREE on register. <b>Referral:</b> invite a friend, they pay ₹99, you get ₹50 + they get extra credit. <b>Bureau/agents:</b> ₹999/mo → 25 profiles + monthly report.</>}
            </div>

            {/* 🎁 ADD-ONS */}
            <div className="mt-6">
              <SectionHeading eyebrow={duo("Add-ons", "అదనపువి")} title={`🎁 ${duo("Extra value — beyond credits", "క్రెడిట్లకు మించి")}`} subtitle={te ? "ఇవి per-item: boost, who-viewed, గుణమేళనం రిపోర్ట్, verification badge." : "Per-item extras: boost, who-viewed, gunamelanam report, verification badge."} telugu align="left" />
              <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {addons.map((a) => (
                  <div key={a.code} className="bg-white rounded-2xl p-4 card-shadow border border-gold/25 flex flex-col">
                    <div className="text-xl font-bold text-maroon">₹{a.price}</div>
                    <div className="text-[13px] font-bold text-ink">{a.label}</div>
                    <div className="text-[11px] text-gray-600 flex-1">{a.telugu}</div>
                    <button onClick={() => buy(a.code)} disabled={busy || !myId}
                      className="mt-3 gold-gradient text-maroon font-bold text-[12px] py-2 rounded-xl disabled:opacity-50">
                      {te ? <>₹{a.price} తీసుకోండి</> : <>Take for ₹{a.price}</>}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {needsLogin ? (
        <div className="mt-6">
          <AuthGate title={`🔒 ${duo("Login for your inbox / credits / shortlist", "ఇన్‌బాక్స్ / క్రెడిట్లు / షార్ట్‌లిస్ట్‌కు లాగిన్ చేయండి")}`}
            note={te ? "ఈ private data సురక్షితంగా ఉంచాం (వేరే వాళ్లు మీ inbox చూడలేరు). Phone OTP login 10 seconds." : "This private data is kept secure (others can\u2019t see your inbox). Phone OTP login takes 10 seconds."} />
        </div>
      ) : null}
    </main>
  );
}

/* 📍 WAVE 36 — sent-request tracker (status timeline) */
function TrackRequest({ requestId }: { requestId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<any[] | null>(null);
  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (steps) return;
    const { ok, data } = await apiGet<any>(`/api/interest/status/${encodeURIComponent(requestId)}`);
    if (ok && data) setSteps(data.steps || []);
  };
  return (
    <>
      <button onClick={() => void toggle()} className="text-[12px] font-bold text-sky-700 underline">
        📍 {te ? "Track" : "Track"}
      </button>
      {open && (
        <div className="basis-full rounded-xl bg-slate-50 p-2 text-[11px]">
          {(steps || []).map((s: any, i: number) => (
            <p key={i} className={s.done ? "text-emerald-700" : "text-slate-500"}>{s.done ? "✅" : "⏳"} {s.step}</p>
          ))}
          {!steps && <p className="text-slate-400">⏳…</p>}
        </div>
      )}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 text-center card-shadow border border-gold/20">
      <div className="text-3xl">💌</div>
      <div className="text-[13px] text-gray-600 mt-2">{text}</div>
    </div>
  );
}
