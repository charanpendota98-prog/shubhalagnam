"use client";

/**
 * MANA VIVAHA — REQUESTS DASHBOARD ( Interest model — chatting LEDU)
 * ====================================================================
 * • Interest pampu (1 credit; modati 3 FREE); notification queue/delivery separate states
 * • Inbox: vachina requests →  Accept /  Decline (decline returns one request credit once)
 * • Sent: pampina requests + status + accepted-request account contact access
 * • Plans: ₹99 → 5 requests | ₹199 → 12 | ₹299 → 25 | ₹499 → 50 (VIP)  — add-ons + renewal tho
 * • Anti-ban WhatsApp status (queue + random gap) chupisthundi
 */
import { useCallback, useEffect, useRef, useState } from "react";
import AuthGate from "@/components/AuthGate";
import { authHeaders, apiPost, apiGet, apiDisplayMessage, getToken, readApiJson} from "@/lib/api";
import Link from "next/link";
import { Check, Clock3, CreditCard, Eye, Heart, Inbox, Mail, RefreshCw, Send } from "lucide-react";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import "./workspace.css";
import { validRequestSecondary, type SecondaryPanel } from "@/lib/requests-secondary";
import PayBox from "@/components/PayBox";
import AcceptedNextSteps from "@/components/AcceptedNextSteps";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { stateFullName } from "@/lib/telugu-data";

type Plan = { code: string; price: number; profiles: number; label: string; telugu: string; badge: string; per_profile: number; perks?: string[] };
type Addon = { code: string; price: number; label: string; label_en?: string; telugu: string; description_en?: string; kind: string };
type Saved = { saved_at: string; profile: any };
type Req = {
  request_id: string; from_id: string; to_id: string; status: string;
  note?: string; note_en?: string; observations?: string[]; created_at?: string; credit_refunded?: boolean;
  requester?: any; profile?: any; requester_phone?: string; contact?: string; actions?: string[];
};

type RequestRead = "loading" | "ready" | "error";
const record = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const requestCount = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
function validRequests(value: unknown, owner: string, kind: "inbox" | "sent"): value is Record<string, any> {
  const key = kind === "inbox" ? "received" : "sent";
  if (!record(value) || value.success === false || value.tsap_id !== owner || !Array.isArray(value[key])) return false;
  const ids = new Set<string>();
  for (const row of value[key]) {
    if (!record(row) || typeof row.request_id !== "string" || !row.request_id.trim() || ids.has(row.request_id) ||
        !["pending", "accepted", "declined", "expired", "withdrawn"].includes(row.status) ||
        typeof row.from_id !== "string" || !/^[A-Za-z0-9_-]+$/.test(row.from_id) ||
        typeof row.to_id !== "string" || !/^[A-Za-z0-9_-]+$/.test(row.to_id) ||
        (kind === "inbox" ? row.to_id : row.from_id) !== owner) return false;
    ids.add(row.request_id);
    const profile = row[kind === "inbox" ? "requester" : "profile"];
    if (profile != null && !record(profile)) return false;
    if (profile) {
      if (profile.tsap_id != null && profile.tsap_id !== row[kind === "inbox" ? "from_id" : "to_id"]) return false;
      for (const v of Object.values(profile)) if (v != null && typeof v !== "string" && typeof v !== "boolean" &&
        !(typeof v === "number" && Number.isFinite(v)) && !Array.isArray(v) && !record(v)) return false;
      for (const k of ["full_name", "age", "education", "education_detail", "job", "company", "salary", "height", "district", "state", "caste", "gothram", "star", "rasi", "verification_level"])
        if (profile[k] != null && typeof profile[k] !== "string" && !(typeof profile[k] === "number" && Number.isFinite(profile[k]))) return false;
    }
    for (const k of ["requester_phone", "contact", "note", "note_en"]) if (row[k] != null && typeof row[k] !== "string") return false;
    if (row.observations != null && (!Array.isArray(row.observations) || !row.observations.every((v: unknown) => typeof v === "string"))) return false;
    if (row.actions != null && (!Array.isArray(row.actions) || !row.actions.every((v: unknown) => typeof v === "string" && ["accept", "decline"].includes(v)))) return false;
    if (row.actions?.length && (kind !== "inbox" || row.status !== "pending")) return false;
    if (row.credit_refunded != null && typeof row.credit_refunded !== "boolean") return false;
  }
  const counts = kind === "inbox" ? ["pending", "accepted", "declined", "expired"] : ["pending", "accepted"];
  return counts.every(k => requestCount(value[k]) && value[k] === value[key].filter((r: Req) => r.status === k).length);
}

const PLANS_FALLBACK: Plan[] = [
  { code: "S_99", price: 99, profiles: 5, label: "Sambandham", telugu: "₹99 → 5 interest requests", badge: "Entry • ₹20/request", per_profile: 20 },
  { code: "S_199", price: 199, profiles: 12, label: "Family", telugu: "₹199 → 12 interest requests", badge: "₹17/request", per_profile: 17 },
  { code: "S_299", price: 299, profiles: 25, label: "Premium", telugu: "₹299 → 25 interest requests", badge: "₹12/request", per_profile: 12 },
  { code: "S_499", price: 499, profiles: 50, label: "VIP", telugu: "₹499 → 50 interest requests", badge: "VIP • ₹10/request", per_profile: 10 },
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
  const profileField = (value: unknown) => {
    const text = String(value ?? "").trim();
    if (!text || text === "—" || text === "-" || text.toLowerCase() === "not stated") return "";
    return te ? text : apiDisplayMessage({ message_en: text }, false, "");
  };
  const [needsLogin, setNeedsLogin] = useState(false);
  const [myId, setMyId] = useState("");
  const [tab, setTab] = useState<"inbox" | "sent" | "send" | "plans" | "saved" | "viewers">("inbox");
  const [credits, setCredits] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>(PLANS_FALLBACK);
  const [inbox, setInbox] = useState<any>({ received: [], pending: 0, accepted: 0, declined: 0 });
  const [sent, setSent] = useState<any>({ sent: [] });
  const [requestReads, setRequestReads] = useState<Record<"inbox" | "sent", RequestRead>>({ inbox: "loading", sent: "loading" });
  const readEpoch = useRef(0);
  const inboxReady = requestReads.inbox === "ready" && inbox.tsap_id === myId;
  const sentReady = requestReads.sent === "ready" && sent.tsap_id === myId;
  const [toId, setToId] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err" | "info"; text: string } | null>(null);
  const [lastSend, setLastSend] = useState<any>(null);
  const [wa, setWa] = useState<any>(null);
  const [showOwnerMsg, setShowOwnerMsg] = useState(false);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [renewal, setRenewal] = useState<any>(null);
  const [saved, setSaved] = useState<any>(null);
  const [secondaryOwner, setSecondaryOwner] = useState("");
  const [secondaryReads, setSecondaryReads] = useState<Record<SecondaryPanel, RequestRead>>({ credits: "loading", saved: "loading", views: "loading", consent: "loading", quality: "loading" });
  const secondaryReady = (key: SecondaryPanel) => secondaryOwner === myId && secondaryReads[key] === "ready";
  //  WAVE 9 ADVANCED — Telugu interest templates + consent ledger + profile strength
  const [templates, setTemplates] = useState<{ id: string; text: string; text_en?: string; tag?: string; tag_en?: string }[]>([]);
  const [consent, setConsent] = useState<{ consents: any[]; count: number } | null>(null);
  const [quality, setQuality] = useState<any>(null);
  const [views, setViews] = useState<any>(null);

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
      .then((r) => readApiJson(r))
      .then((d) => {
        if (d?.plans) setPlans(d.plans.filter((p: Plan) => p.price > 0));
        if (d?.addons) setAddons(d.addons);
        if (d?.renewal) setRenewal(d.renewal);
      })
      .catch(() => {});
    fetch("/api/wa/status").then((r) => readApiJson(r)).then(setWa).catch(() => {});
  }, []);

  const refresh = useCallback(
    async (id: string) => {
      if (!id) return;
      const epoch = ++readEpoch.current;
      setRequestReads({ inbox: "loading", sent: "loading" });
      setInbox({ received: [] }); setSent({ sent: [] });
      const readRequests = async (kind: "inbox" | "sent") => {
        try {
          const r = await fetch(`/api/interest/${kind}/${encodeURIComponent(id)}`, { headers: authHeaders() });
          if (epoch !== readEpoch.current) return;
          if (r.status === 401) setNeedsLogin(true);
          const data = await readApiJson(r);
          if (epoch !== readEpoch.current) return;
          if (!r.ok || !validRequests(data, id, kind)) throw new Error("Request list unavailable");
          if (kind === "inbox") setInbox(data); else setSent(data);
          setRequestReads(old => ({ ...old, [kind]: "ready" }));
        } catch {
          if (epoch === readEpoch.current) setRequestReads(old => ({ ...old, [kind]: "error" }));
        }
      };
      void readRequests("inbox"); void readRequests("sent");
      setSecondaryOwner(id);
      setSecondaryReads({ credits: "loading", saved: "loading", views: "loading", consent: "loading", quality: "loading" });
      setCredits(null); setSaved(null); setViews(null); setConsent(null); setQuality(null); setTemplates([]);
      const paths: Record<SecondaryPanel, string> = { credits: `/api/credits/${encodeURIComponent(id)}`, saved: `/api/saved/${encodeURIComponent(id)}`, views: `/api/views/${encodeURIComponent(id)}`, consent: `/api/consent/log/${encodeURIComponent(id)}`, quality: `/api/profile/${encodeURIComponent(id)}/quality` };
      const setters: Record<SecondaryPanel, (value: any) => void> = { credits: value => setCredits(value.credits), saved: setSaved, views: setViews, consent: setConsent, quality: setQuality };
      const readSecondary = async (key: SecondaryPanel) => {
        try {
          const response = await fetch(paths[key], { headers: authHeaders() });
          if (epoch !== readEpoch.current) return;
          if (response.status === 401) setNeedsLogin(true);
          const data = await readApiJson(response);
          if (epoch !== readEpoch.current) return;
          if (!response.ok || !validRequestSecondary(key, data, id)) throw new Error("Secondary panel unavailable");
          setters[key](data);
          setSecondaryReads(old => ({ ...old, [key]: "ready" }));
        } catch {
          if (epoch === readEpoch.current) setSecondaryReads(old => ({ ...old, [key]: "error" }));
        }
      };
      for (const key of Object.keys(paths) as SecondaryPanel[]) void readSecondary(key);
      void fetch("/api/templates/interest").then(readApiJson).then(data => {
        if (epoch !== readEpoch.current || !Array.isArray(data?.templates)) return;
        setTemplates(data.templates.filter((v: any) => record(v) && typeof v.id === "string" && typeof v.text === "string" && ["text_en", "tag", "tag_en"].every(k => v[k] == null || typeof v[k] === "string")));
      }).catch(() => {});
    },
    [te]
  );

  useEffect(() => {
    setNeedsLogin(false);
    if (myId) void refresh(myId);
    return () => { readEpoch.current++; };
  }, [myId, refresh]);

  const saveId = (v: string) => {
    const id = v.trim().toUpperCase();
    setMyId(id);
    if (typeof window !== "undefined" && id) window.localStorage.setItem("tsap_id", id);
    if (id) refresh(id);
  };

  const sendInterest = async () => {
    if (!myId) return setToast({ kind: "err", text: te ? "ముందుగా మీ ప్రొఫైల్ ID ఇవ్వండి. నమోదు తర్వాత అది వస్తుంది." : "Enter your Profile ID first (you get it after register)" });
    if (!toId.trim()) return setToast({ kind: "err", text: te ? "ఆసక్తి తెలపాలనుకున్న ప్రొఫైల్ ID ఇవ్వండి." : "Which profile to send to — type the Profile ID" });
    setBusy(true);
    setToast(null);
    try {
      const r = await fetch("/api/interest/send", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ from_id: myId, to_id: toId.trim().toUpperCase(), note }),
      });
      const d = await readApiJson(r);
      if (r.status === 402) {
        setToast({ kind: "err", text: apiDisplayMessage(d, te, te ? "క్రెడిట్లు లేవు" : "No request credits remain. Choose a plan to continue.") });
        setTab("plans");
        setCredits(0);
      } else if (!r.ok) {
        setToast({ kind: "err", text: apiDisplayMessage(d, te, te ? "అభ్యర్థన పంపబడలేదు. మళ్లీ ప్రయత్నించండి." : "The request could not be sent. Please try again.") });
      } else {
        setLastSend(d);
        setToast({ kind: "ok", text: apiDisplayMessage(d, te, te ? "ఆసక్తి అభ్యర్థన పంపబడింది." : "Interest request sent.") });
        setNote("");
        setCredits(d.credits_left);
        refresh(myId);
      }
    } catch {
      setToast({ kind: "err", text: te ? "సమాచారం అందలేదు. మళ్లీ ప్రయత్నించండి." : "Network problem — retry" });
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
      const d = await readApiJson(r);
      setToast({ kind: r.ok ? "ok" : "err", text: apiDisplayMessage(d, te, r.ok
        ? (te ? "అభ్యర్థన వివరాలు నవీకరించబడ్డాయి." : "Request status updated.")
        : (te ? "అభ్యర్థనను నవీకరించలేకపోయాం." : "The request could not be updated.")) });
      refresh(myId);
    } catch {
      setToast({ kind: "err", text: "Network problem" });
    }
    setBusy(false);
  };

  const removeSaved = async (id: string) => {
    try {
      const r = await fetch("/api/save", { method: "POST", headers: authHeaders(),
        body: JSON.stringify({ tsap_id: myId, saved_id: id, saved: false }) });
      if (!r.ok) {
        setToast({ kind: "err", text: te ? "దాచుకున్న ప్రొఫైళ్ల నుంచి తొలగించలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "Could not remove the shortlisted profile. Please retry." });
        return;
      }
      refresh(myId);
    } catch {
      setToast({ kind: "err", text: te ? "తొలగించబడిందో నిర్ధారించలేకపోయాం. మళ్లీ ప్రయత్నించడం సురక్షితం." : "Could not confirm removal. Retrying is safe." });
    }
  };

  const chip = (s: string) => {
    const cls = STATUS_STYLE[s] || "bg-gray-100 text-gray-600 border-gray-300";
    const label =
      s === "pending"
        ? te ? "పరిశీలనలో ఉంది" : "Pending"
        : s === "accepted"
        ? te ? "ఆమోదించబడింది" : "Accepted"
        : s === "declined"
        ? te ? "తిరస్కరించబడింది" : "Declined"
        : s === "expired"
        ? te ? "గడువు ముగిసింది" : "Expired"
        : s === "withdrawn"
        ? te ? "రద్దు చేయబడింది" : "Withdrawn"
        : s.toUpperCase();
    return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cls}`}><Clock3 aria-hidden="true" className="h-3 w-3" />{label.trim()}</span>;
  };

  const visibleTemplates = te ? templates : templates.filter((template) => Boolean(template.text_en));

  return (
    <div className="mv-requests-workspace min-h-dvh pb-36">
      <div className="mx-auto max-w-6xl px-4 pt-5">
        <header className="requests-intro"><p>{te ? "మన వివాహ · పరిచయాలు" : "MANA VIVAHA · CONNECTIONS"}</p><h1>{te ? "మీ ఆసక్తి అభ్యర్థనలు." : "Your interest requests."}</h1><p>{te ? "ఇక్కడ చాట్ సదుపాయం లేదు. ప్రొఫైల్ యజమాని ఆమోదించిన తర్వాతే సంప్రదింపు వివరాలు కనిపిస్తాయి." : "No in-app chat. Contact details follow the profile owner's acceptance."}</p></header>
        <section className="requests-identity" aria-label={te ? "ఎలా పని చేస్తుంది" : "How this works"}>
          <details className="requests-rules"><summary>{te ? "అనుమతి, క్రెడిట్లు, సమాచారం అందడం గురించి" : "Consent, credits and delivery rules"}</summary>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mv-chip">{te ? "ఇక్కడ చాట్ లేదు" : "No in-app chat"}</span>
              <span className="mv-chip">{te ? "ఆసక్తి అభ్యర్థన" : "Interest request"}</span>
              <span className="mv-chip">{te ? "ఆమోదం తర్వాత సంప్రదింపు వివరాలు" : "Contact after acceptance"}</span>
            </div>
            <h2 className="mv-surface__title mv-surface__title--ink mt-3">
              {te ? "ఎలా పని చేస్తుంది" : "How this works"}
            </h2>
            <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-slate-600">
              {te ? <>నచ్చిన ప్రొఫైల్‌కు <b>ఆసక్తి తెలపండి</b>. సమాచారం అందడం అందుబాటులో ఉన్న సేవలపై ఆధారపడుతుంది. అందుతుందని హామీ లేదు.
                ప్రొఫైల్ యజమాని <b>ఆమోదించిన తర్వాతే</b> సంబంధిత ఖాతాల్లో సంప్రదింపు వివరాలు కనిపిస్తాయి. తిరస్కరిస్తే ఖర్చయిన 1 అభ్యర్థన క్రెడిట్ ఒకసారి తిరిగి వస్తుంది. ఇది నగదు వాపసు కాదు.
                డబ్బు చెల్లించినా అనుమతి అవసరమే. ఆన్‌లైన్ పరిచయాల వివరాలను మీరే నిర్ధారించుకోండి.</> : <>Send <b>Interest</b> to a profile you like. Notification availability depends on configured services; delivery is not guaranteed.
                If the profile owner <b>accepts</b>, contact details appear in accepted-request account views. A declined request returns the spent request credit once; this is not a cash refund.
                Paid credits cannot bypass consent; verify details independently.</>}
            </p>
          </details>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-0">
              <label htmlFor="requests-profile-id" className="text-[11px] font-bold text-slate-600">{te ? "మీ ప్రొఫైల్ ID" : "Your Profile ID"}</label>
              <input
                id="requests-profile-id"
                value={myId}
                onChange={(e) => setMyId(e.target.value.toUpperCase())}
                onBlur={(e) => saveId(e.target.value)}
                placeholder={te ? "నమోదు చేసుకున్న మీ ప్రొఫైల్ ID" : "Your registered Profile ID"}
                className="mt-1 min-h-11 w-full max-w-[224px] rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-[#1a1a1a] outline-none focus-brand sm:w-56" aria-label={te ? "మీ ప్రొఫైల్ ID" : "Your Profile ID"} />
            </div>
            <button type="button" onClick={() => saveId(myId)} className="mv-btn mv-btn--primary">
              {te ? "నా అభ్యర్థనలు చూడండి" : "Load my dashboard"}
            </button>
            <div className="ml-auto rounded-xl border border-gold/40 bg-[#fffaf3] px-4 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{te ? "క్రెడిట్లు" : "Credits"}</div>
              <div className="text-lg font-bold leading-none text-maroon">{secondaryReady("credits") && credits !== null ? credits : "—"}</div>
              {myId && secondaryReads.credits === "error" && <button type="button" onClick={() => void refresh(myId)} className="text-xs underline">{te ? "క్రెడిట్లు మళ్లీ చూడండి" : "Retry credit balance"}</button>}
            </div>
          </div>
        </section>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {toast && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-[13px] ${
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
        <nav aria-label={te ? "అభ్యర్థనల విభాగాలు" : "Request sections"} className="requests-nav mb-4">
          {[
            { k: "inbox", l: te ? `వచ్చిన అభ్యర్థనలు${inboxReady && inbox.pending ? ` (${inbox.pending})` : ""}` : `Received${inboxReady && inbox.pending ? ` (${inbox.pending})` : ""}` },
            { k: "sent", l: te ? `పంపిన అభ్యర్థనలు${sentReady && sent.sent?.length ? ` (${sent.sent.length})` : ""}` : `Sent${sentReady && sent.sent?.length ? ` (${sent.sent.length})` : ""}` },
            { k: "send", l: te ? "ఆసక్తి తెలపండి" : "Send interest" },
            { k: "saved", l: `${te ? "దాచుకున్న ప్రొఫైళ్లు" : "Saved"}${secondaryReady("saved") && saved?.count ? ` (${saved.count})` : ""}` },
            { k: "viewers", l: `${te ? "మీ ప్రొఫైల్‌ను చూసినవారు" : "Viewers"}${secondaryReady("views") && views?.total_views ? ` (${views.total_views})` : ""}` },
            { k: "plans", l: te ? "ప్లాన్లు, క్రెడిట్లు" : "Plans & Credits" },
          ].map((t) => (
            <button type="button"
              key={t.k}
              onClick={() => setTab(t.k as any)}
              aria-current={tab === t.k ? "page" : undefined}
              aria-controls="requests-task-panel"
              className={`requests-section ${tab === t.k ? "is-active" : ""}`}
            >
              {(() => { const Icon = ({inbox: Inbox, sent: Send, send: Mail, saved: Heart, viewers: Eye, plans: CreditCard} as const)[t.k as "inbox" | "sent" | "send" | "saved" | "viewers" | "plans"]; return <Icon aria-hidden="true" className="inline-block h-4 w-4 shrink-0" />; })()} {t.l.trim()}
            </button>
          ))}
        </nav>

        {/* Panel transition on the shared motion token. */}
        <div id="requests-task-panel" className="mv-panel" key={tab}>

        {/* INBOX */}
        {tab === "inbox" && (
          <div className="space-y-3">
            {!myId && <Empty text={te ? "వచ్చిన అభ్యర్థనలను చూడటానికి మీ ప్రొఫైల్ ID ఇవ్వండి." : "Enter your Profile ID — to see inbox."} />}
            {myId && !inboxReady && <RequestReadState state={requestReads.inbox} te={te} retry={() => void refresh(myId)} />}
            {myId && inboxReady && inbox.received?.length === 0 && <Empty text={te ? "ఇంకా అభ్యర్థనలు రాలేదు." : "No requests yet. Post your profile to 1 channel — reach grows."} />}
            {inboxReady && inbox.received?.some((it: Req) => it.status === "accepted") ? <AcceptedNextSteps /> : null}
            {inboxReady && inbox.received?.map((it: Req) => (
              <Reveal key={it.request_id}>
                <div className="mv-surface mv-surface__body mv-card">
                  <div className="flex flex-wrap items-center gap-2">
                    {chip(it.status)}
                    {it.credit_refunded && <span className="text-[10px] font-bold text-emerald-700">↩ {te ? "1 క్రెడిట్ తిరిగి" : "1 credit returned"}</span>}
                    <span className="text-[11px] text-gray-500 font-mono">{it.request_id}</span>
                    {/* A phone number is only ever shown once the owner has
                        accepted; on a pending request the column stays empty
                        rather than hinting at data that does not exist yet. */}
                    {it.status === "accepted" && it.requester_phone ? (
                      <span className="ml-auto font-mono text-[11px] text-slate-600">{it.requester_phone}</span>
                    ) : null}
                  </div>
                  <div className="mt-2 grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="font-bold text-[15px] text-maroon">{it.requester?.full_name || (te ? "ప్రొఫైల్ పేరు ఇవ్వలేదు" : "Profile name not supplied")}{it.requester?.age ? ` (${it.requester.age}y)` : ""}</div>
                      <p className="mt-1 font-mono text-[11px] text-slate-600">{it.from_id}</p>
                      <RequestProfileFacts profile={it.requester} te={te} />
                      {(te ? it.note : apiDisplayMessage({ message_en: it.note_en, message: it.note }, false, "")) ? <div className="mt-2 text-[12px] bg-cream border border-gold/30 rounded-xl p-2"> &ldquo;{te ? it.note : apiDisplayMessage({ message_en: it.note_en, message: it.note }, false, "")}&rdquo;</div> : null}
                    </div>
                    <div>
                      {it.observations?.length ? (
                        <div className="text-[12px] text-gray-700">
                          <div className="font-bold text-maroon mb-1">{te ? "ప్రొఫైళ్లలో ఉన్న వివరాలు. సంబంధం సరిపోతుందనే నిర్ణయం కాదు:" : "Listed details (not a match verdict):"}</div>
                          {it.observations
                            .map((item) => te ? item : apiDisplayMessage({ message_en: item }, false, ""))
                            .filter(Boolean)
                            .slice(0, 4)
                            .map((item, index) => <div key={`${index}-${item}`}>• {item}</div>)}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {it.actions?.includes("accept") ? (
                          <>
                            <button type="button" onClick={() => respond(it.request_id, "accept")} disabled={busy} className="mv-btn mv-btn--contact min-h-11">
                              <Check aria-hidden="true" className="h-4 w-4" /> {te ? "ఆమోదించు — నంబర్ పంచుకో" : "Accept & share number"}
                            </button>
                            <button type="button" onClick={() => respond(it.request_id, "decline")} disabled={busy} className="mv-btn mv-btn--secondary min-h-11 border-rose-300 text-rose-700 hover:bg-rose-50">
                              {te ? "తిరస్కరించు" : "Decline"}
                            </button>
                          </>
                        ) : it.status === "accepted" ? (
                          <div className="mv-note mv-note--cool flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[12px] font-semibold">

                            <span>{te ? "ఆమోదించబడింది. వారి ఫోన్ (మాస్క్ చేసినది):" : "Accepted — their phone (masked):"}</span>
                            <b className="font-mono text-[13px] tracking-tight text-[#0b4f4a]">{it.requester_phone || "—"}</b>
                            <Link href={`/search/${encodeURIComponent(it.from_id || "")}?contact=qr`} className="font-bold text-maroon underline">{te ? "📇 Contact QR చూడండి" : "📇 View contact QR"}</Link>
                            <span className="text-[11px] font-medium text-slate-600">
                              {te ? "(WhatsApp ద్వారా సమాచారం అందుతుందని హామీ లేదు)" : "(external WhatsApp delivery is not guaranteed)"}
                            </span>
                          </div>
                        ) : (
                          <div className="text-[12px] text-gray-500 italic py-1">
                            {it.status === "declined" ? (it.credit_refunded ? (te ? "ఆసక్తి అభ్యర్థన తిరస్కరించబడింది. 1 క్రెడిట్ తిరిగి వచ్చింది" : "Interest declined • 1 credit returned") : (te ? "ఆసక్తి అభ్యర్థన తిరస్కరించబడింది" : "Interest declined")) : it.status === "expired" ? (it.credit_refunded ? (te ? "గడువు ముగిసింది. 1 క్రెడిట్ తిరిగి వచ్చింది" : "Expired • 1 credit returned") : (te ? "గడువు ముగిసింది" : "Expired")) : te ? `ఈ అభ్యర్థన: ${it.status}` : `This request: ${it.status}`}
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
            {!myId && <Empty text={te ? "పంపిన అభ్యర్థనలను చూడటానికి మీ ప్రొఫైల్ ID ఇవ్వండి." : "Enter your Profile ID to see sent requests."} />}
            {myId && !sentReady && <RequestReadState state={requestReads.sent} te={te} retry={() => void refresh(myId)} />}
            {myId && sentReady && sent.sent?.length === 0 && <Empty text={te ? "ఇంకా ఎవరికీ ఆసక్తి తెలపలేదు. ఆసక్తి తెలపండి అనే విభాగంలో పంపవచ్చు." : "No interest sent yet — start in the  'Send interest' tab."} />}
            {sentReady && sent.sent?.some((it: Req) => it.status === "accepted") ? <AcceptedNextSteps /> : null}
            {sentReady && sent.sent?.map((it: Req) => (
              <Reveal key={it.request_id}>
                <div className="mv-surface mv-surface__body mv-card flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {chip(it.status)}
                      <span className="font-bold text-[14px] text-maroon">{it.profile?.full_name || (te ? "ప్రొఫైల్ పేరు ఇవ్వలేదు" : "Profile name not supplied")}{it.profile?.age ? ` (${it.profile.age}y)` : ""}</span>
                      <span className="text-[11px] text-gray-500 font-mono">{it.to_id}</span>
                      {it.credit_refunded && <span className="text-[10px] font-bold text-emerald-700">↩ {te ? "1 క్రెడిట్ తిరిగి" : "1 credit returned"}</span>}
                    </div>
                    <div className="text-[12px] text-gray-600 mt-1">
                      {[profileField(it.profile?.education), profileField(it.profile?.job), profileField(it.profile?.district) ? ` ${profileField(it.profile?.district)}` : "", it.profile?.state ? stateFullName(it.profile.state, te) : "", profileField(it.profile?.caste) ? ` ${profileField(it.profile?.caste)}` : ""].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                      {te ? "సంప్రదింపు" : "Contact"}
                    </div>
                    <div className={`text-[13px] font-bold ${it.status === "accepted" ? "text-emerald-700" : "text-gray-400"}`}>
                      {it.status === "accepted" ? (<>{it.contact || "—"} <Link href={`/search/${encodeURIComponent(it.to_id || "")}?contact=qr`} className="ml-1 text-[11px] font-bold text-maroon underline">{te ? "📇 Contact QR చూడండి" : "📇 View contact QR"}</Link></>) : te ? "ఆమోదం తర్వాత" : "After acceptance"}
                    </div>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <Link href={`/search/${it.to_id}`} className="mv-btn mv-btn--secondary min-h-11">
                      {te ? "ప్రొఫైల్ →" : "Profile →"}
                    </Link>
                    {it.status === "pending" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void respond(it.request_id, "withdraw")}
                        className="mv-btn min-h-11 border border-rose-300 bg-rose-50 px-3 text-[12px] font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                      >
                        ↩ {te ? "రద్దు చేయి (1 క్రెడిట్ వాపసు)" : "Withdraw (Refund 1 Credit)"}
                      </button>
                    )}
                    <TrackRequest requestId={it.request_id} />
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {/* SEND */}
        {tab === "send" && (
          <div className="grid md:grid-cols-2 gap-5">
            <div className="mv-surface mv-surface__body">
              <SectionHeading eyebrow={duo("1 credit = 1 interest request", "1 క్రెడిట్ = 1 ఆసక్తి అభ్యర్థన")} title={` ${duo("Send interest", "ఆసక్తి తెలపండి")}`} subtitle={te ? "ప్రొఫైల్ ID ఇవ్వండి. సమాచారం అందడం అందుబాటులో ఉన్న సేవలపై ఆధారపడుతుంది. ప్రొఫైల్ యజమాని ఆమోదించిన తర్వాతే సంప్రదింపు వివరాలు పంచుతాం." : "Enter a profile ID — notification availability depends on configuration; contact sharing follows owner acceptance."} telugu align="left" />
              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-[12px] font-bold text-ink">{te ? "ప్రొఫైల్ ID *" : "Profile ID *"}</label>
                  <input
                    value={toId}
                    onChange={(e) => setToId(e.target.value.toUpperCase())}
                    placeholder={te ? "ఆసక్తి తెలపాలనుకున్న ప్రొఫైల్ ID" : "Profile ID to send interest to"}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gold/40 font-mono text-sm outline-none focus-brand" aria-label={te ? "ఆసక్తి తెలపాలనుకున్న ప్రొఫైల్ ID" : "Recipient Profile ID"} />
                </div>
                {visibleTemplates.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold text-ink">{te ? "సిద్ధంగా ఉన్న సందేశాలు (ఎంచుకుని సవరించండి)" : "Ready-made English messages (select to edit)"}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {visibleTemplates.slice(0, 6).map((t) => {
                        const text = te ? t.text : (t.text_en || "");
                        const tag = te ? t.tag : (t.tag_en || t.id);
                        return (
                          <button key={t.id} type="button" onClick={() => setNote(text.slice(0, 280))}
                            className="rounded-full border border-gold/40 bg-cream px-2.5 py-1 text-[10px] font-semibold text-maroon hover:bg-gold/20 min-h-11"
                            title={text}>
                            {tag}: {text.slice(0, 22)}…
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-[12px] font-bold text-ink">{te ? "చిన్న సందేశం (మీ ఇష్టం)" : "Short message (optional)"}</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 280))}
                    rows={3}
                    placeholder={te ? "మీ ప్రొఫైల్ వివరాలను చూశాను. మరింత తెలుసుకోవాలని ఉంది." : "Your profile looks good — our family values match. Let\u2019s talk."}
                    className="mt-1 w-full px-3 py-2.5 rounded-xl border border-gold/40 text-sm outline-none focus-brand" aria-label="Text area" />
                  <div className="text-[10px] text-gray-500 mt-1">{note.length}/280 • {te ? "గోప్యత కోసం ఫోన్ నంబర్ లేదా ఇమెయిల్ ఇవ్వవద్దు" : "no number/email (privacy policy)"}</div>
                </div>
                <button type="button" onClick={sendInterest} disabled={busy} className="w-full maroon-gradient text-white font-bold py-3 rounded-xl hover-lift disabled:opacity-60">
                  {busy ? (te ? "పంపిస్తున్నాం…" : "Sending…") : te ? "ఆసక్తి తెలపండి" : "Send interest"}
                </button>
                <div className="text-[11px] text-gray-500">
                  {te ? "క్రెడిట్లు:" : "Credits:"} <b>{secondaryReady("credits") && credits !== null ? credits : "—"}</b> • {te ? "మొదటి 3 అభ్యర్థనలు ఉచితం. తిరస్కరిస్తే 1 అభ్యర్థన క్రెడిట్ ఒకసారి తిరిగి వస్తుంది." : "First 3 requests FREE • Declines return one request credit once"}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {lastSend ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <div className="font-bold text-emerald-900">{te ? <> {lastSend.request_id} పంపించారు</> : <> {lastSend.request_id} sent</>}</div>
                  <div className="text-[12px] text-emerald-900 mt-1">
                     {lastSend.expires_in_days} {te ? "రోజులు చెల్లుతుంది. మిగిలిన క్రెడిట్లు:" : "days valid • credits left"} <b>{lastSend.credits_left}</b>
                  </div>
                  <div className="text-[11px] text-emerald-900/80 mt-1">
                    {te ? "ప్రొఫైల్ వివరాలు, మీరు దాచుకున్న ఎంపికలు మాత్రమే చూపిస్తున్నాం. సంబంధం ఎంతవరకు సరిపోతుందనే కొలమానం లెక్కించలేదు." : "Profile details and saved preferences only; no compatibility score is calculated."}
                  </div>
                  <div className="text-[12px] text-emerald-900 mt-2">
                     {te ? "WhatsApp సమాచారం:" : "WhatsApp notification:"} {lastSend.whatsapp?.owner_queued ? (te ? "పంపే జాబితాలో చేరింది. అందుతుందని హామీ లేదు" : "queued; delivery is not guaranteed") : (te ? "పంపే జాబితాలో చేరలేదు" : "not queued")}
                  </div>
                  <button type="button" onClick={() => setShowOwnerMsg(!showOwnerMsg)} className="mt-3 text-[12px] font-bold text-emerald-800 underline">
                    {showOwnerMsg ? (te ? "సందేశం దాచండి" : "Hide message") : (te ? "వారికి పంపే సందేశం చూడండి" : "Preview their message")}
                  </button>
                  {showOwnerMsg && (
                    <pre className="mt-2 text-[11px] whitespace-pre-wrap bg-white border border-emerald-200 rounded-xl p-3 max-h-72 overflow-auto">{te ? lastSend.owner_message_preview : apiDisplayMessage({ message_en: lastSend.owner_message_preview_en, message: lastSend.owner_message_preview }, false, "An English preview is not available.")}</pre>
                  )}
                </div>
              ) : (
                <div className="bg-cream border border-gold/30 rounded-2xl p-5">
                  <div className="font-bold text-maroon">{te ? "ఎలా పని చేస్తుంది?" : "How it works?"}</div>
                  <ol className="mt-2 text-[12px] text-gray-700 space-y-1 list-decimal list-inside">
                    <li>{te ? "మీ ప్రొఫైల్ ID, వారి ప్రొఫైల్ ID ఇవ్వండి. అభ్యర్థనకు 1 క్రెడిట్ ఖర్చవుతుంది." : "Enter your ID + their ID → we send request (1 credit)"}</li>
                    <li>{te ? "సమాచారం అందడం అందుబాటులో ఉన్న సేవలపై ఆధారపడుతుంది." : "Notification availability depends on configured services"}</li>
                    <li>{te ? "ప్రొఫైల్ యజమాని ఆమోదించిన తర్వాత, సంబంధిత ఖాతాల్లో సంప్రదింపు వివరాలు కనిపిస్తాయి. సమాచారం అందుతుందని హామీ లేదు." : "After owner acceptance, contact details appear in accepted-request account views; notification delivery is not guaranteed"}</li>
                    <li>{te ? "తిరస్కరిస్తే లేదా ఏడు రోజుల పాటు స్పందన లేక గడువు ముగిస్తే 1 అభ్యర్థన క్రెడిట్ ఒకసారి తిరిగి వస్తుంది. నగదు వాపసు కాదు." : "Decline or seven-day no-response expiry returns one request credit once (not a cash refund)"}</li>
                  </ol>
                  <div className="mt-3 text-[11px] text-gray-600">{te ? "ఇక్కడ చాట్ లేదు. అవాంఛిత ప్రవర్తనను ఫిర్యాదు చేయవచ్చు లేదా బ్లాక్ చేయవచ్చు. బయట జరిగే కాల్స్, సందేశాలను ఈ సేవ నియంత్రించదు." : "No in-site chat. Use report/block controls for unwanted behavior; the service cannot control external calls/messages."}</div>
                </div>
              )}

              {myId && !secondaryReady("quality") && <SecondaryReadState state={secondaryReads.quality} te={te} label={te ? "ప్రొఫైల్ వివరాల శాతం" : "Profile completeness"} retry={() => void refresh(myId)} />}
              {secondaryReady("quality") && quality && (
                <div className="bg-white border border-gold/30 rounded-2xl p-4">
                  <div className="font-bold text-maroon text-[13px]">{te ? "మీరు నింపిన ప్రొఫైల్ వివరాలు:" : "Your profile fields:"} {quality.completeness?.percent ?? "—"}%</div>
                  <div className="mt-1 text-[11px] text-gray-600">{te ? "ఇది నింపిన వివరాల శాతం మాత్రమే. గుర్తింపు నిర్ధారణ లేదా సంబంధం సరిపోతుందనే కొలమానం కాదు." : "Filled fields only; not an identity or match score."}</div>
                  <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-2 gold-gradient" style={{ width: `${Math.min(100, Number(quality.completeness?.percent ?? 0))}%` }} />
                  </div>
                  {Array.isArray(te ? quality.completeness?.important_telugu : quality.completeness?.important_en)
                    && (te ? quality.completeness.important_telugu : quality.completeness.important_en).length > 0 && (
                    <ul className="mt-2 text-[11px] text-gray-700 list-disc list-inside space-y-0.5">
                      {(te ? quality.completeness.important_telugu : quality.completeness.important_en)
                        .slice(0, 3)
                        .map((item: string) => (te ? item : apiDisplayMessage({ message_en: item }, false, "")).replace(/\p{Extended_Pictographic}|[\uFE0F\u200D]/gu, "").trim())
                        .filter(Boolean)
                        .map((item: string, i: number) => <li key={i}>{item}</li>)}
                    </ul>
                  )}

                  {(quality.photo_tip_telugu || quality.photo_tip_en) && (
                    <div className="mt-1 text-[11px] text-gray-600"> {te ? "ఫోటో కనిపించడం మీ గోప్యతా ఎంపికలపై ఆధారపడి ఉంటుంది. ఫలితాలకు హామీ లేదు." : "Photo visibility depends on your privacy choices. Results are not guaranteed."}</div>
                  )}
                </div>
              )}

              {myId && !secondaryReady("consent") && <SecondaryReadState state={secondaryReads.consent} te={te} label={te ? "సంప్రదింపు అనుమతుల చరిత్ర" : "Contact-access history"} retry={() => void refresh(myId)} />}
              {secondaryReady("consent") && consent && (
                <div className="bg-white border border-emerald-200 rounded-2xl p-4">
                  <div className="font-bold text-emerald-900 text-[13px]"> {te ? "సంప్రదింపు అనుమతుల చరిత్ర" : "Contact-access history"}</div>
                  <div className="mt-1 text-[11px] text-emerald-800">
                    {te ? <>సంప్రదింపు అనుమతి ఇచ్చిన లేదా నిరాకరించిన నమోదులు: {consent.count}. సమాచారం అందిందనడానికి ఇవి ఆధారం కావు.</> : <>Contact-access grants and declines recorded: {consent.count}. This is not proof of notification delivery.</>}
                  </div>
                  {Array.isArray(consent.consents) && consent.consents.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {consent.consents.slice(0, 5).map((e: any, i: number) => (
                        <li key={i} className="text-[11px] text-gray-700 border-l-2 border-emerald-300 pl-2">
                          {e.with || (te ? "ప్రొఫైల్ వివరాలు లేవు" : "Profile not supplied")} · {e.contact_access_granted ? (te ? "అనుమతి ఇచ్చారు" : "Access granted") : (te ? "అనుమతి ఇవ్వలేదు" : "Access not granted")}{e.at && Number.isFinite(Date.parse(e.at)) ? ` · ${e.at.slice(0, 16)}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 text-[11px] text-gray-600">{te ? "ఇంకా సంప్రదింపు వివరాలు పంచుకున్న నమోదు లేదు. ప్రొఫైల్ యజమాని ఆమోదించినప్పుడు నమోదవుతుంది. సమాచారం అందిందనడానికి ఇది ఆధారం కాదు." : "No contact-access event yet — owner acceptance is recorded here; this is not proof of notification delivery."}</div>
                  )}
                </div>
              )}

              {wa?.queued != null && Number(wa.queued) > 0 && (
                <div className="bg-navy text-white rounded-2xl p-4">
                  <div className="font-bold text-[13px]"> {te ? "WhatsApp పంపే జాబితా స్థితి" : "WhatsApp queue status"}</div>
                  <div className="text-[11px] opacity-90 mt-1">{te ? `పంపే జాబితాలో ${wa.queued} నమోదులు ఉన్నాయి. సమాచారం అందిందని నిర్ధారణ కాలేదు.` : `${wa.queued} queue entries reported; external delivery is not confirmed.`}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* SAVED / SHORTLIST */}
        {tab === "saved" && (
          <div className="space-y-3">
            {!myId && <Empty text={te ? "దాచుకున్న ప్రొఫైళ్ల కోసం మీ ప్రొఫైల్ ID ఇవ్వండి." : "Enter your Profile ID to see saved profiles."} />}
            {myId && !secondaryReady("saved") && <SecondaryReadState state={secondaryReads.saved} te={te} label={te ? "దాచుకున్న ప్రొఫైళ్లు" : "Saved profiles"} retry={() => void refresh(myId)} />}
            {secondaryReady("saved") && saved.count === 0 && <Empty text={te ? "ఇంకా ప్రొఫైళ్లను దాచుకోలేదు. సంబంధాల పేజీలో దాచుకోవచ్చు." : "No saved profiles yet. You can save profiles from Matches."} />}
            {secondaryReady("saved") && saved.saved.map((x: Saved) => (
              <Reveal key={x.profile.tsap_id}>
                <div className="mv-surface mv-surface__body mv-card flex flex-wrap items-center gap-3">
                  <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
                    <div className="font-bold text-[14px] text-maroon break-words">
                       {x.profile.full_name || (te ? "పేరు ఇవ్వలేదు" : "Name not supplied")}{x.profile.age ? ` (${x.profile.age}${te ? " సం." : "y"})` : ""}
                      <span className="ml-2 text-[11px] text-gray-500 font-mono break-all">{x.profile.tsap_id}</span>
                    </div>
                    <div className="text-[12px] text-gray-600 mt-1">
                      {[profileField(x.profile.education), profileField(x.profile.job), profileField(x.profile.district) ? ` ${profileField(x.profile.district)}` : "", x.profile.state ? stateFullName(x.profile.state, te) : "", profileField(x.profile.caste) ? ` ${profileField(x.profile.caste)}` : ""].filter(Boolean).join(" • ")}
                    </div>
                  </div>
                  <button type="button" onClick={() => { setToId(x.profile.tsap_id); setTab("send"); }} className="text-[12px] font-bold maroon-gradient text-white px-3 py-2 rounded-xl">
                    {te ? "ఆసక్తి తెలపండి" : "Send interest"}
                  </button>
                  <Link href={`/search/${x.profile.tsap_id}`} className="text-[12px] font-bold text-maroon underline">{te ? "ప్రొఫైల్ →" : "Profile →"}</Link>
                  <button type="button" onClick={() => removeSaved(x.profile.tsap_id)} className="text-[12px] text-gray-500 underline">{te ? "తొలగించండి" : "Remove"}</button>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {/* VIEWERS */}
        {tab === "viewers" && (
          <div className="space-y-3">
            {!myId && <Empty text={te ? "మీ ప్రొఫైల్‌ను చూసినవారి కోసం మీ ప్రొఫైల్ ID ఇవ్వండి." : "Load your Profile ID to see viewers."} />}
            {myId && !secondaryReady("views") && <SecondaryReadState state={secondaryReads.views} te={te} label={te ? "మీ ప్రొఫైల్‌ను చూసినవారు" : "Profile viewers"} retry={() => void refresh(myId)} />}
            {secondaryReady("views") && views && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[[te ? "చూసిన మొత్తం సార్లు" : "Total views", views.total_views], [te ? "చూసినవారి సంఖ్య" : "Unique viewers", views.unique_viewers],
                    [te ? "ఈరోజు" : "Today", views.today], [te ? "చూసినవారి పేర్లు" : "Who-viewed", views.whoviewed_unlocked ? (te ? "అందుబాటులో ఉన్నాయి" : "Unlocked") : (te ? "కనిపించవు" : "Locked")]].map(([l, v]) => (
                    <div key={String(l)} className="mv-surface mv-surface__body mv-card">
                      <div className="text-[11px] text-gray-500">{l}</div>
                      <div className="text-xl font-bold text-maroon">{v as any}</div>
                    </div>
                  ))}
                </div>
                {!views.whoviewed_unlocked && (
                  <div className="bg-cream border border-gold/30 rounded-2xl p-4 flex flex-wrap items-center gap-3">
                    <div className="text-[13px] text-gray-700 flex-1">
                      {te ? <>చూసినవారి పేర్లు చూడటానికి <b>₹49</b> (30 రోజులు). లేదా ₹299, అంతకంటే ఎక్కువ ప్లాన్లలో అదనపు చెల్లింపు అవసరం లేదు.</> : <> To see viewer names <b>₹49</b> (30 days) — or free with ₹299+ plan.</>}
                    </div>
                    {myId ? <PayBox planCode="WHOVIEWED_49" price={49} label={te ? "వీక్షకుల పేర్లు అన్‌లాక్" : "Unlock viewer names"} tsapId={myId} /> : <span className="text-xs text-slate-600">{te ? "ముందుగా ప్రొఫైల్ ID ఇవ్వండి" : "Enter your Profile ID first"}</span>}
                  </div>
                )}
                <div className="mv-surface mv-surface__body mv-card">
                  {(views.whoviewed_unlocked ? views.viewers : views.viewers_masked).map((v: any, i: number) => (
                    <div key={i} className="text-[12px] py-1.5 border-b last:border-0 border-gray-100 flex flex-wrap gap-3">
                      <span className="font-bold text-maroon">{v.full_name || (te ? "పేరు కనిపించదు" : "Hidden member")}</span>
                      <span className="text-gray-600">{[profileField(v.caste), profileField(v.district), v.age ? `${v.age} ${te ? "సం." : "years"}` : ""].filter(Boolean).join(" • ")}</span>
                      {v.tsap_id ? <Link href={`/search/${v.tsap_id}`} className="text-maroon underline">{te ? "ప్రొఫైల్ →" : "profile →"}</Link> : null}
                    </div>
                  ))}
                  {!(views.viewers?.length || views.viewers_masked?.length) && (
                    <div className="text-[12px] text-gray-500">{te ? "ఇంకా వీక్షకులు నమోదు కాలేదు." : "No viewers have been recorded yet."}</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* PLANS */}
        {tab === "plans" && (
          <div>
            <SectionHeading eyebrow={duo("Credits", "క్రెడిట్లు")} title={duo("Plans — 1 credit = 1 interest request", "ప్లాన్లు — 1 క్రెడిట్ = 1 ఆసక్తి అభ్యర్థన")} subtitle={te ? "ఒక్కో అభ్యర్థన ఖర్చు ప్లాన్‌ను బట్టి తగ్గుతుంది (సుమారు ₹20 నుంచి ₹10 వరకు). తిరస్కరిస్తే లేదా ఏడు రోజుల పాటు స్పందన లేక గడువు ముగిస్తే 1 అభ్యర్థన క్రెడిట్ ఒకసారి తిరిగి వస్తుంది. నగదు వాపసు కాదు." : "₹/request drops by tier (about ₹20 → ₹10). Decline or seven-day no-response expiry returns one request credit once (not a cash refund)."} telugu align="left" />
            {renewal && (
              <div className="mt-3 rounded-2xl bg-cream border border-gold/30 p-3 text-[12px] text-gray-700">
                {te ? <> <b>Renewal offer (పాత customers):</b> ₹{renewal.price} → <b>{renewal.profiles} interest requests</b> — first-time ₹99 → 5 requests.</> : <> <b>Renewal offer (old customers):</b> ₹{renewal.price} → <b>{renewal.profiles} interest requests</b> — first-time ₹99 → 5 requests.</>}
                {myId && <div className="mt-3 max-w-sm"><PayBox planCode={renewal.code} price={renewal.price} label={te ? "ప్లాన్ రిన్యూ చేయండి" : "Renew plan"} tsapId={myId} /></div>}
              </div>
            )}
            <div className="mt-4 grid md:grid-cols-3 gap-4">
              {plans.map((p, i) => (
                <Reveal key={p.code} delay={i * 80}>
                  <div className={`mv-surface mv-surface__body h-full ${p.code === "S_299" ? "border-gold" : ""}`}>
                    {p.badge && <div className="text-[10px] font-bold text-gold-deep tracking-widest uppercase">{p.badge}</div>}
                    <div className="text-2xl font-bold text-maroon mt-1">₹{p.price}</div>
                    <div className="font-bold text-[14px] text-ink">{p.profiles} {te ? "ఆసక్తి అభ్యర్థనలు" : "interest requests"}</div>
                    <div className="text-[11px] text-gray-500">₹{p.per_profile}/{te ? "అభ్యర్థన" : "request"} • {te ? p.label : apiDisplayMessage({ message_en: (p as any).label_en, message: p.label }, false, p.code)}</div>
                    <ul className="mt-3 text-[12px] text-gray-700 space-y-1">
                      {(p.perks || [`${p.profiles} interest requests`, "Notification availability varies", "Contact sharing after owner acceptance", "Refund policy as shown in account"])
                        .filter((perk: string) => te || Boolean(apiDisplayMessage(perk, false, "")))
                        .map((perk: string) => (
                          <li key={perk}> {te ? perk : apiDisplayMessage({ message_en: perk, message: perk }, false, "")}</li>
                        ))}
                    </ul>
                    {myId ? (
                      <div className="mt-4"><PayBox planCode={p.code} price={p.price} label={`${p.profiles} ${te ? "ఆసక్తి అభ్యర్థనలు" : "interest requests"}`} tsapId={myId} /></div>
                    ) : (
                      <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-600">{te ? "మీ ప్రొఫైల్ ID ఇవ్వండి" : "Enter your Profile ID"}</p>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-4 text-[12px] text-gray-600 bg-cream border border-gold/30 rounded-2xl p-4">
{te ? <> <b>Free plan:</b> నమోదు సమయంలో 3 interest requests. <b>Referral:</b> valid attachment పై కొత్త user కు +1, referrer కు +2 request credits (cash కాదు). Referrer కు ₹50 ఒక్కసారి మాత్రమే—మొదటి S_99/S_199/S_299/S_499 consumer-plan payment కనీసం ₹99 అయితే అర్హత ఉండవచ్చు; exclusions మరియు manual review వర్తిస్తాయి. <b>Bureau/agents:</b> ₹999 / 30 days → 25 request credits.</> : <> <b>Free plan:</b> 3 interest requests on registration. <b>Referral:</b> a valid attachment gives +1 request credit to the new user and +2 to the referrer (not cash). The referrer may qualify for ₹50 once only on the first S_99/S_199/S_299/S_499 consumer-plan payment of at least ₹99; exclusions and manual review apply. <b>Bureau/agents:</b> ₹999 / 30 days → 25 request credits.</>}
            </div>

            {/*  ADD-ONS */}
            <div className="mt-6">
              <SectionHeading eyebrow={duo("Add-ons", "అదనపువి")} title={` ${duo("Optional add-ons", "ఐచ్ఛిక అదనపు సేవలు")}`} subtitle={te ? "అవసరమైతే విడిగా తీసుకోగల సేవలు: ప్రొఫైల్ ప్రచారం, చూసినవారి పేర్లు, ఫోటో పరిశీలన అభ్యర్థన." : "Per-item extras: profile boost, who-viewed access, manual photo-review request."} telugu align="left" />
              <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {addons.map((a) => (
                  <div key={a.code} className="mv-surface mv-surface__body flex flex-col">
                    <div className="text-xl font-bold text-maroon">₹{a.price}</div>
                    <div className="text-[13px] font-bold text-ink">{te ? a.label : apiDisplayMessage({ message_en: a.label_en, message: a.label }, false, a.code)}</div>
                    <div className="text-[11px] text-gray-600 flex-1">{te ? a.telugu : (a.description_en || "")}</div>
                    {myId ? (
                      <div className="mt-3"><PayBox planCode={a.code} price={a.price} label={te ? a.label : apiDisplayMessage({ message_en: a.label_en, message: a.label }, false, a.code)} tsapId={myId} /></div>
                    ) : (
                      <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-center text-xs text-slate-600">{te ? "ముందుగా ప్రొఫైల్ ID ఇవ్వండి" : "Enter your Profile ID first"}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        </div>
        {/* JATHAKAM REVIEW */}
        <section className="mb-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-bold text-[#5c0822]"> {te ? "జాతక పత్రం పరిశీలన" : "Real Jathakam document review"}</div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-700">{te ? "నక్షత్రంతో మాత్రమే సంబంధం సరిపోతుందనే కొలమానాన్ని లేదా ఊహించిన జాతకాన్ని చూపించము. మీ జాతక పత్రాన్ని పంపి, పరిశీలన స్థితిని చూడవచ్చు." : "No star-only score or invented chart is shown. Upload your own document and see only its review state."}</p>
            </div>
            <Link href="/porutham" className="inline-flex min-h-11 items-center rounded-xl bg-[#7a0c2e] px-4 py-2.5 text-xs font-bold text-white">{te ? "జాతక పరిశీలన" : "Open Jathakam review"} →</Link>
          </div>
        </section>

      </div>
      {needsLogin ? (
        <div className="mt-6">
          <AuthGate title={` ${duo("Login for your inbox / credits / shortlist", "ఇన్‌బాక్స్ / క్రెడిట్లు / షార్ట్‌లిస్ట్‌కు లాగిన్ చేయండి")}`}
            note={te ? "ఈ సమాచారం మీ ఖాతాకు మాత్రమే. చూసేందుకు లాగిన్ చేయండి." : "This private data is kept secure (others can\u2019t see your inbox)."} />
        </div>
      ) : null}
    </div>
  );
}

/*  WAVE 36 — sent-request tracker (status timeline) */
function TrackRequest({ requestId }: { requestId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState<any[] | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const toggle = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (steps) return;
    const { ok, data } = await apiGet<any>(`/api/interest/status/${encodeURIComponent(requestId)}`);
    if (ok && data) {
      setSteps(data.steps || []);
      const noteText = te
        ? String(data.note_telugu || data.note || "")
        : apiDisplayMessage({ message_en: data.note_en, message: data.note, message_telugu: data.note_telugu }, false, "");
      setStatusNote(noteText);
    }
  };
  return (
    <>
      <button type="button" onClick={() => void toggle()} aria-expanded={open} className="mv-btn mv-btn--secondary min-h-11 border-sky-300 px-3 text-[12px] text-sky-800 hover:bg-sky-50">
         {te ? "స్థితి చూడండి" : "Track"}
      </button>
      {open && (
        <div className="basis-full rounded-xl bg-slate-50 p-2 text-[11px]">
          {(steps || []).map((s: any, i: number) => (
            <p key={i} className={s.done ? "text-emerald-700" : "text-slate-600"}>{s.done ? "" : ""} {te ? (s.step_telugu || s.step) : apiDisplayMessage({ message_en: s.step_en, message: s.step, message_telugu: s.step_telugu }, false, "Status update")}</p>
          ))}
          {statusNote ? <p className="mt-1 text-[10px] leading-relaxed text-slate-600">{statusNote}</p> : null}
          {!steps && <p className="text-slate-400">…</p>}
        </div>
      )}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mv-surface mv-surface__body text-center">
      <Mail aria-hidden="true" className="mx-auto h-8 w-8 text-maroon" />
      <div className="text-[13px] text-gray-600 mt-2">{text}</div>
    </div>
  );
}

function RequestReadState({ state, te, retry }: { state: RequestRead; te: boolean; retry: () => void }) {
  return <div className="mv-surface mv-surface__body">
    {state === "error" ? <><p role="alert" className="text-sm font-bold text-rose-800">{te ? "అభ్యర్థనలు తెచ్చుకోలేకపోయాం. అభ్యర్థనలు లేవని దీని అర్థం కాదు." : "Requests could not be loaded. This does not mean there are no requests."}</p><button type="button" onClick={retry} className="mv-btn mv-btn--secondary mt-3"><RefreshCw aria-hidden="true" className="h-4 w-4" />{te ? "మళ్లీ ప్రయత్నించండి" : "Retry requests"}</button></> : <p role="status">{te ? "అభ్యర్థనలు తెస్తున్నాం…" : "Loading requests…"}</p>}
  </div>;
}

function RequestProfileFacts({ profile, te }: { profile: Record<string, any> | null; te: boolean }) {
  const field = (v: unknown) => {
    const raw = typeof v === "string" || typeof v === "number" ? String(v).trim() : "";
    if (!raw || raw === "—" || raw === "-" || raw.toLowerCase() === "not stated") return "";
    return te ? raw : apiDisplayMessage({ message_en: raw }, false, "");
  };
  const p = profile || {};
  const groups = [
    [p.education, p.education_detail], [p.job, p.company], [p.salary, p.height],
    [p.district, p.state ? stateFullName(p.state, te) : ""],
    [p.caste, field(p.gothram) ? `${te ? "గోత్రం" : "Gothram"}: ${field(p.gothram)}` : ""],
    [p.star, field(p.rasi) ? `${te ? "రాశి" : "Moon sign"}: ${field(p.rasi)}` : ""],
  ].map(values => values.map(field).filter(Boolean).join(" · ")).filter(Boolean);
  const verification = ({ phone: te ? "ఫోన్ OTP: ఈ నంబర్ వినియోగాన్ని మాత్రమే నిర్ధారిస్తుంది." : "Phone OTP: confirms access to this number only.", photo: te ? "సమర్పించిన ఫోటో పరిశీలన మాత్రమే. గుర్తింపు నిర్ధారణ కాదు." : "Submitted photo review only. Not an identity check.", id: te ? "ప్రభుత్వ ID పరిశీలన స్థితి మాత్రమే. ఇతర వివరాలు నిర్ధారించబడవు." : "Government ID review status only. Other details are not verified." } as Record<string, string>)[p.verification_level];
  return <div className="mt-1 text-[12px] leading-relaxed text-gray-600">{verification && <p className="text-[11px] text-emerald-800">{verification}</p>}{groups.length ? groups.map((line, i) => <p key={i}>{line}</p>) : <p>{te ? "ఈ ప్రొఫైల్‌లో ఇతర వివరాలు ఇవ్వలేదు." : "No other profile details were supplied."}</p>}</div>;
}

function SecondaryReadState({ state, te, label, retry }: { state: RequestRead; te: boolean; label: string; retry: () => void }) {
  return <div className="mv-surface mv-surface__body" aria-label={label}>{state === "error" ? <><p role="alert" className="text-sm text-rose-800">{te ? `${label}: సమాచారం తెచ్చుకోలేకపోయాం. నమోదులు లేవని దీని అర్థం కాదు.` : `${label} could not be loaded. This does not mean there are no records.`}</p><button type="button" onClick={retry} className="mv-btn mv-btn--secondary mt-3"><RefreshCw aria-hidden="true" className="h-4 w-4" />{te ? "మళ్లీ ప్రయత్నించండి" : "Retry"}</button></> : <p role="status">{te ? `${label}: సమాచారం తెస్తున్నాం…` : `Loading ${label.toLowerCase()}…`}</p>}</div>;
}
