"use client";
/**
 * 👁️ /search/[id] — PROFILE VIEW (WAVE 9 rewrite)
 * ===============================================
 * 🐞 FIXES (mundu unna bugs):
 *   • Removed the legacy hard-coded sample profile fallback — unknown IDs stay unavailable
 *   • "Number Chudu 1 Credit" button — kani backend aa number eppudu ivvadu (fake promise)
 *   • Credit locally deduct ayyedi (server ki telidu) → balance mismatch
 *   • ✅ Real /api/search/{id} data, honest 404s, consent-based contact access,
 *     and working block/report actions.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProfileSkeleton } from "@/components/Skeletons";
import AuthGate from "@/components/AuthGate";
import RasiChart from "@/components/RasiChart";
import { apiGet, apiPost, authHeaders, getToken } from "@/lib/api";
import { SITE_CONFIG } from "@/lib/site-config";
import { normalizeWhatsAppPhone, whatsappPhoneLink } from "@/lib/wa";
import { firstName } from "@/lib/names";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { stateFullName } from "@/lib/telugu-data";
import ProfileRail from "@/components/ProfileRail";
import QuickUnlockModal from "@/components/QuickUnlockModal";
import WhatsAppProposalModal from "@/components/WhatsAppProposalModal";
import VoiceBiodataPlayer from "@/components/VoiceBiodataPlayer";

type Row = Record<string, any>;

// 🛡️ P0 FIX: printBiodata() builds a raw HTML string from user-submitted
// profile fields (full_name, about_myself, company, education_detail, ...)
// and injects it via document.write() into a new same-origin window — React's
// JSX auto-escaping does NOT apply here since it's manual string interpolation.
// Without escaping, a profile registered with e.g. full_name containing
// "<script>...</script>" would execute attacker JS in a window that has
// window.opener access back into this origin (incl. localStorage["tsap_token"]
// — full account takeover for anyone who clicks "Print Biodata" on a
// malicious profile). Escape every interpolated value before use.
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const CONSENT_STEPS_TE = [
  "1️⃣ Interest పంపండి (మొదటి 3 requests ఉచితం) — మీ member-provided profile వివరాలు పంపబడతాయి",
  "2️⃣ అవతలి profile owner accept చేస్తేనే contact వివరాలు share అవుతాయి",
  "3️⃣ తర్వాత వివరాలను స్వయంగా నిర్ధారించుకుని కుటుంబాలు మాట్లాడుకోవచ్చు",
];
const CONSENT_STEPS_EN = [
  "1️⃣ Send Interest (first 3 requests FREE) — your member-submitted profile details are sent",
  "2️⃣ Contact details are shared only if the other profile owner accepts",
  "3️⃣ Verify details independently before families proceed",
];

export default function ProfileView() {
  const { lang } = useLang();
  const te = lang === "te";
  const params = useParams();
  const idFromUrl = String(params?.id || "").toUpperCase();
  const [searchId, setSearchId] = useState(idFromUrl);
  const [data, setData] = useState<Row | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [myTsapId, setMyTsapId] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [savedNow, setSavedNow] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [reported, setReported] = useState(false);
  const [unlocked, setUnlocked] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState("");
  const [chart, setChart] = useState<Row | null>(null);

  useEffect(() => {
    const id = (searchId || idFromUrl || "").trim();
    if (!id) return;
    setVoiceUrl(""); setChart(null);
    void apiGet<Row>(`/api/voice/${encodeURIComponent(id)}`).then(({ ok, data }) => {
      if (ok && data?.has_voice) setVoiceUrl(String(data.voice_url || ""));
    });
    void apiGet<Row>(`/api/astro/chart/${encodeURIComponent(id)}`).then(({ ok, data }) => {
      if (ok && data?.success) setChart(data);
    });
  }, [searchId, idFromUrl]);

  const profile: Row = data?.profile || {};
  const quality = (data?.quality as Row) || null;

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setErr(""); setMsg(null);
    const { ok, status, data: d, errorTelugu } = await apiGet<Row>(`/api/search/${encodeURIComponent(id)}`);
    setLoading(false);
    if (!ok || !d) {
      setData(null);
      setErr(status === 404
        ? (te ? `🔍 Profile ID దొరకలేదు: ${id} — ID correct గా ఉందా check చెయ్యండి (register అయ్యారా?)` : `🔍 Profile ID not found: ${id} — check the ID is correct (registered?)`)
        : (errorTelugu || (te ? "Profile లోడ్ కాలేదు — మళ్లీ ప్రయత్నించండి" : "Could not load this profile — please retry")));
      return;
    }
    setData(d);
  }, [te]);

  useEffect(() => {
    try {
      setMyTsapId(localStorage.getItem("tsap_id") || "");
    } catch { /* ignore */ }
    void load(idFromUrl);
  }, [idFromUrl, load]);

  useEffect(() => {
    if (!idFromUrl) return;
    const my = (() => { try { return localStorage.getItem("tsap_id") || ""; } catch { return ""; } })();
    void fetch("/api/view", {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ tsap_id: idFromUrl, viewer_id: my }),
    });
  }, [idFromUrl]);

  const sendInterest = async (templateId?: string) => {
    setSending(true); setMsg(null);
    const { ok, data: d, status, errorTelugu: eTel, needsLogin: nl } = await apiPost<Row>("/api/interest/send",
      { from_id: myTsapId, to_id: searchId, channel: "search_page", ...(templateId ? { template_id: templateId } : {}) });
    setSending(false);
    if (nl) { setNeedsLogin(true); return; }
    if (ok) setMsg({ ok: true, text: String(d?.message_telugu || (te ? "Interest పంపించారు. Owner accept చేసిన తర్వాత contact details privacy settings ప్రకారం share అవుతాయి." : "Interest sent. Contact details follow the owner's acceptance and privacy settings.")) });
    else if (status === 402) setMsg({ ok: false, text: te ? "⚠️ Credits అయిపోయాయి — ₹99 → 5 interest requests. Contact sharing acceptance తర్వాతే." : "⚠️ Credits are depleted — ₹99 → 5 interest requests. Contact sharing follows acceptance." });
    else if (status === 404) setMsg({ ok: false, text: te ? "మీ Profile ID register చెయ్యలేదు — ముందు FREE register చెయ్యండి." : "Your Profile ID is not registered — FREE register first." });
    else setMsg({ ok: false, text: eTel });
  };

  const doUnlock = async () => {
    if (!myTsapId) {
      setShowUnlockModal(true);
      return;
    }
    setUnlocking(true); setMsg(null);
    const { ok, data: d, needsLogin: nl, errorTelugu: eTel } = await apiPost<Row>("/api/unlock",
      { viewer_id: myTsapId, target_id: searchId });
    setUnlocking(false);
    if (nl) {
      setShowUnlockModal(true);
      return;
    }
    if (ok && d?.success && d?.phone) {
      setUnlocked(String(d.phone || ""));
      setMsg({ ok: true, text: String(d.message_telugu || (te ? "✅ Number unlock అయ్యింది!" : "✅ Number unlocked!")) });
    } else {
      setShowUnlockModal(true);
      setMsg({ ok: false, text: String((d as Row)?.message_telugu || eTel) });
    }
  };

  const toggleSave = async () => {
    const { ok, data: d, needsLogin: nl, errorTelugu: eTel } = await apiPost<Row>("/api/save", { tsap_id: myTsapId, target_id: searchId });
    if (nl) { setNeedsLogin(true); return; }
    if (!ok) { setMsg({ ok: false, text: eTel }); return; }
    setSavedNow(!!d?.saved);
    setMsg({ ok: true, text: String(d?.message_telugu || (te ? "Shortlist update అయ్యింది" : "Shortlist updated")) });
  };

  const doBlock = async () => {
    const { ok, data: d, needsLogin: nl, errorTelugu: eTel } = await apiPost<Row>("/api/block", { tsap_id: myTsapId, block_id: searchId, reason: "profile page నుంచి" });
    if (nl) { setNeedsLogin(true); return; }
    if (ok) { setBlocked(true); setMsg({ ok: true, text: String(d?.message_telugu || (te ? "Block అయ్యింది" : "Blocked")) }); }
    else setMsg({ ok: false, text: eTel });
  };

  const doReport = async () => {
    const { ok, data: d, needsLogin: nl, errorTelugu: eTel } = await apiPost<Row>("/api/report", { reporter_id: myTsapId, target_id: searchId, category: "fake_profile", detail: "Profile page నుంచి report" });
    if (nl) { setNeedsLogin(true); return; }
    if (ok) { setReported(true); setMsg({ ok: true, text: String(d?.message_telugu || d?.ack_telugu || (te ? "Report పంపబడింది — సమీక్ష సమయం మారవచ్చు" : "Report submitted — review timing may vary")) }); }
    else setMsg({ ok: false, text: eTel });
  };

  const shareWhatsApp = () => {
    if (!profile?.tsap_id) return;
    const details = [
      profile.age != null && String(profile.age).trim() ? `${profile.age}y` : "",
      profile.height || "",
      profile.caste || "",
      profile.education || "",
      profile.job || "",
      profile.district || "",
      profile.state ? stateFullName(profile.state, te) : "",
      profile.salary || "",
    ].filter((value) => String(value || "").trim());
    const text = [
      `🙏 మన వివాహ profile — ${firstName(profile.full_name)} (${profile.tsap_id})`,
      details.length ? details.join(" • ") : "",
      "🔒 Contact details follow the consent and privacy flow; verify profile information independently.",
      `Full details: ${window.location.origin}/search/${encodeURIComponent(String(profile.tsap_id))}`,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const printBiodata = () => {
    if (!profile) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) { window.print(); return; }
    // 🛡️ P0 FIX: escape every user-submitted field before string-interpolating
    // it into raw HTML (see escapeHtml() doc comment above for why this matters).
    const e = escapeHtml;
    const nameOrId = e(profile.full_name || profile.tsap_id);
    const tsapId = e(profile.tsap_id);
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>వివాహ బయోడేటా — ${nameOrId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #1e293b; padding: 24px; }
    .card { max-width: 650px; margin: 0 auto; border: 4px double #7A0C2E; border-radius: 16px; padding: 24px; background: #fffdfa; }
    .header { text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 16px; margin-bottom: 20px; }
    .title { color: #7A0C2E; font-size: 24px; font-weight: bold; margin: 0; }
    .sub { color: #8B6914; font-size: 13px; margin-top: 4px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
    .item { background: #fff; padding: 10px 14px; border: 1px solid #fed7aa; border-radius: 8px; }
    .label { font-size: 11px; color: #64748b; font-weight: bold; }
    .val { font-size: 14px; color: #0f172a; font-weight: bold; margin-top: 2px; }
    .about { margin-top: 16px; padding: 12px; background: #fff; border: 1px solid #fed7aa; border-radius: 8px; font-size: 13px; line-height: 1.5; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">💍 మన వివాహ (Mana Vivaha) — వివాహ పరిచయ పత్రం</div>
      <div class="sub">MANA VIVAHA • TS & AP TELUGU MATRIMONY (ID: ${tsapId})</div>
    </div>
    <div class="grid">
      <div class="item"><div class="label">పేరు (Name)</div><div class="val">${nameOrId}</div></div>
      <div class="item"><div class="label">వయస్సు & ఎత్తు (Age & Height)</div><div class="val">${e(profile.age)} సం॥ · ${e(profile.height || "—")}</div></div>
      <div class="item"><div class="label">కులం & ఉపకులం (Caste)</div><div class="val">${e(profile.caste || "—")} ${profile.sub_caste ? `(${e(profile.sub_caste)})` : ""}</div></div>
      <div class="item"><div class="label">గోత్రం (Gothram)</div><div class="val">${e(profile.gothram || "—")}</div></div>
      <div class="item"><div class="label">నక్షత్రం & రాశి (Star & Sign)</div><div class="val">${e(profile.star || "—")} / ${e(profile.rasi || "—")}</div></div>
      <div class="item"><div class="label">చదువు (Education)</div><div class="val">${e(profile.education || "—")} ${e(profile.education_detail || "")}</div></div>
      <div class="item"><div class="label">ఉద్యోగం / వ్యాపారం (Job)</div><div class="val">${e(profile.job || "—")} ${profile.company ? `@ ${e(profile.company)}` : ""}</div></div>
      <div class="item"><div class="label">వార్షిక ఆదాయం (Annual Salary)</div><div class="val">${e(profile.salary || "—")}</div></div>
      <div class="item"><div class="label">ప్రాంతం / నివాసం (Location)</div><div class="val">${e(profile.district || "—")}, ${e(profile.state ? stateFullName(profile.state, te) : "—")}</div></div>
      <div class="item"><div class="label">వైవాహిక స్థితి (Marital Status)</div><div class="val">${e(profile.marital_status || "—")}</div></div>
      <div class="item"><div class="label">కుటుంబ నేపథ్యం (Family)</div><div class="val">${e(profile.family_type || "—")} · ${e(profile.family_status || "—")}</div></div>
      <div class="item"><div class="label">దోషం (Dosham)</div><div class="val">${e(profile.dosham || "—")}</div></div>
    </div>
    ${profile.about_myself ? `<div class="about"><b>స్వవిషయం (About):</b> ${e(profile.about_myself)}</div>` : ""}
    <div class="footer">
      TS & AP Telugu Matrimony profile · verify member details independently · manavivaha.in/search/${tsapId}
    </div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const normalizedUnlocked = normalizeWhatsAppPhone(unlocked);
  const unlockedWhatsAppUrl = whatsappPhoneLink(unlocked);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center gap-2">
        <Link href="/matches" className="text-[12px] font-bold text-[#7A0C2E]">← Matches</Link>
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-2">
          <span>🔍</span>
          <input value={searchId} onChange={(e) => setSearchId(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") void load(searchId.trim()); }}
            placeholder={te ? "Profile ID" : "Search by Profile ID"} aria-label={te ? "Profile ID వెతకండి" : "Profile ID search"}
            className="flex-1 bg-transparent text-sm outline-none" />
          <button onClick={() => void load(searchId.trim())} className="rounded-xl bg-[#7A0C2E] px-3 py-1.5 text-[12px] font-bold text-white">{te ? "చూడు" : "View"}</button>
        </div>
      </div>

      {loading ? <ProfileSkeleton /> : null}
      {!loading && err ? (
        <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
          <p className="font-bold text-amber-900">{err}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href="/matches" className="rounded-xl bg-[#7A0C2E] px-4 py-2 text-sm font-bold text-white">{te ? "💞 Matches చూడు" : "💞 See matches"}</Link>
            <Link href="/register" className="rounded-xl border border-[#7A0C2E] px-4 py-2 text-sm font-bold text-[#7A0C2E]">🆓 Register FREE</Link>
          </div>
        </div>
      ) : null}

      {needsLogin ? <div className="mt-4"><AuthGate note={te ? "Interest పంపడం, shortlist, block — ఈ actions కి OTP login కావాలి (మీ privacy కోసం)." : "Interest, shortlist, block — these actions need OTP login (for your privacy)."} /></div> : null}

      {!loading && !err && data ? (
        <>
          <section className="mt-4 rounded-3xl border border-rose-200 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-[#7A0C2E]">{myTsapId && profile.tsap_id === myTsapId ? (profile.full_name || "Profile") : firstName(profile.full_name)}</h1>
                <p className="font-mono text-[12px] text-slate-500">{profile.tsap_id}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {profile.phone_verified
                    ? <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">✅ Phone OTP verified</span>
                    : <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-slate-600" title={te ? "ఈ phone number కు OTP check నమోదు కాలేదు" : "No phone OTP check is recorded for this number"}>{te ? "ఫోన్ OTP నమోదు కాలేదు" : "Phone OTP not recorded"}</span>}
                  {profile.id_verified ? <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 font-extrabold text-blue-800" title={te ? "ప్రభుత్వ ID ను staff manual గా పరిశీలించారు; ఇది ఇతర వివరాలను ధృవీకరించదు" : "Government ID manually reviewed by staff; this does not verify other profile details"}>🪪 Government ID reviewed</span> : null}
                  {profile.selfie_verified ? <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800" title={te ? "సెల్ఫీ చిత్రం staff review లో ఆమోదించబడింది" : "Selfie image approved in staff review; this is not a liveness check"}>🤳 Selfie reviewed</span> : null}
                  {profile.boosted ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">⚡ Boosted</span> : null}
                  {profile.is_nri ? <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 font-semibold text-sky-800">✈️ NRI{profile.country && profile.country !== "India" ? ` • ${profile.country}` : ""}</span> : null}
                  {profile.profession_label ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">{profile.profession_label}</span> : null}
                </div>
              </div>
              <div className="shrink-0 rounded-2xl bg-rose-50 px-3 py-2 text-center">
                <p className="text-lg font-extrabold text-[#7A0C2E]">{quality?.percent ?? 0}%</p>
                <p className="text-[10px] text-slate-500">profile complete</p>
              </div>
            </div>

            {myTsapId && profile.tsap_id === myTsapId ? (
              <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-300 rounded-2xl p-3">
                <div className="text-xs font-bold text-maroon flex items-center gap-1.5">
                  <span>👑</span>
                  <span>{te ? "ఇది మీ స్వంత ప్రొఫైల్ (మీరు ఎప్పుడైనా వివరాలు మార్చుకోవచ్చు)" : "This is your profile (You can edit anytime)"}</span>
                </div>
                <Link
                  href="/me"
                  className="px-3.5 py-1.5 rounded-xl maroon-gradient text-white text-xs font-bold shadow-xs hover:brightness-105 transition flex items-center gap-1"
                >
                  <span>✏️</span>
                  <span>{te ? "వివరాలు సవరించండి" : "Edit Profile"}</span>
                </Link>
              </div>
            ) : null}

            {voiceUrl ? (
              <div className="mt-3">
                <VoiceBiodataPlayer voiceUrl={voiceUrl} name={profile.full_name} role={profile.gender} />
              </div>
            ) : null}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-slate-700 sm:grid-cols-3">
              {[
                ["🎂 వయస్సు", profile.age != null && String(profile.age).trim() ? `${profile.age}y` : "—"],
                ["📏 ఎత్తు", profile.height || "—"],
                ["🕉️ కులం", `${profile.caste || "—"}${profile.sub_caste ? ` (${profile.sub_caste})` : ""}`],
                ["🎓 చదువు", `${profile.education || "—"}${profile.education_detail ? ` ${profile.education_detail}` : ""}`],
                ["💼 ఉద్యోగం", `${profile.job || "—"}${profile.company ? ` @ ${profile.company}` : ""}`],
                ["💰 ఆదాయం", profile.salary || "—"],
                ["📍 ప్రాంతం", `${profile.district || "—"}, ${profile.state ? stateFullName(profile.state, te) : "—"}`],
                ["⭐ నక్షత్రం (రిఫరెన్స్)", `${profile.star || "—"} / ${profile.rasi || "—"}`],
                ["💍 వైవాహిక స్థితి", profile.marital_status || "—"],
                ["👶 Children • పిల్లలు", profile.children && String(profile.children).trim() ? (profile.children === "None" ? (te ? "లేరు" : "None") : profile.children) : "—"],
                ["🕉️ గోత్రం (రిఫరెన్స్)", profile.gothram || "—"],
                ["👨‍👩‍👧 కుటుంబం", `${profile.family_type || "—"} · ${profile.family_status || "—"}`],
                ["🧿 దోషం", profile.dosham || "—"],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-[11px] text-slate-500">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>

            {profile.about_myself ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                <p className="text-[12px] font-bold text-slate-700">{te ? "📝 మీ గురించి" : "📝 About"}</p>
                <p className="mt-1 text-[13px] text-slate-700">{profile.about_myself}</p>
              </div>
            ) : null}

            {(Array.isArray(data.observations) && data.observations.length > 0)
              || (Array.isArray(data.differences) && data.differences.length > 0)
              || (Array.isArray(data.preference_checks) && data.preference_checks.length > 0) ? (
              <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-labelledby="profile-facts-title">
                <h2 id="profile-facts-title" className="text-sm font-extrabold text-slate-800">
                  {te ? "ప్రొఫైల్ వివరాలు పరిశీలించండి" : "Profile details to review"}
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {te ? "ఇవి సభ్యులు ఇచ్చిన వివరాల మధ్య ఉన్న పోలికలు మాత్రమే; compatibility లేదా identity verdict కాదు." : "These are comparisons of member-entered details only—not a compatibility or identity verdict."}
                </p>
                {Array.isArray(data.observations) && data.observations.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-slate-700">
                    {data.observations.slice(0, 4).map((item: string, i: number) => <li key={`observation-${i}`}>{item}</li>)}
                  </ul>
                )}
                {Array.isArray(data.differences) && data.differences.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-slate-700">
                    {data.differences.slice(0, 4).map((item: string, i: number) => <li key={`difference-${i}`}>{item}</li>)}
                  </ul>
                )}
                {Array.isArray(data.preference_checks) && data.preference_checks.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-slate-200 pt-2">
                    <p className="text-[11px] font-bold text-slate-700">{te ? "మీరు నమోదు చేసిన preferences" : "Your explicitly saved preferences"}</p>
                    {data.preference_checks.slice(0, 4).map((item: Row, i: number) => (
                      <p key={`preference-${i}`} className="text-[11px] text-slate-600">{item.note || item.label || item.status}</p>
                    ))}
                  </div>
                )}
              </section>
            ) : null}
          </section>

          {chart ? (
            <section className="mt-4 rounded-3xl border border-amber-200 bg-white p-5" aria-labelledby="profile-chart-title">
              <h2 id="profile-chart-title" className="mb-3 text-base font-extrabold text-[#7A0C2E]">
                {te ? "🗺️ రాశి చార్ట్ (సాంప్రదాయ సూచన)" : "🗺️ Rasi chart (traditional reference)"}
              </h2>
              <p className="mb-3 text-[11px] text-slate-600">
                {te ? "నక్షత్ర వివరాలు సభ్యులు అందించినవి; ఇది compatibility తీర్పు కాదు." : "Birth details are member-provided; this is not a compatibility verdict."}
              </p>
              <RasiChart houses={chart.houses} moonHouse={chart.moon_house} star={chart.star} rasi={chart.rasi} note={chart.note_telugu} title={te ? "వారి రాశి చార్ట్" : "Their rasi chart"} />
            </section>
          ) : null}

          {/* 🔒 NUMBER LOCK — policy: Mutual consent contact exchange */}
          <section className="mt-4 rounded-3xl border-2 border-rose-300 bg-rose-50 p-5">
            <h2 className="text-lg font-extrabold text-[#7A0C2E]">
              🔒 {te ? "ఫోన్ నంబర్ — •••••••••• (గోప్యతా రక్షణలో ఉంది)" : "Phone Number — •••••••••• (Protected & Locked)"}
            </h2>
            <p className="mt-1 text-[13px] text-rose-900 leading-relaxed">
              {te
                ? "🔒 గోప్యతా విధానం: మహిళలు మరియు కుటుంబాల భద్రత దృష్ట్యా ఫోన్ నంబర్లు పబ్లిక్‌గా కనిపించవు. మీరు 'Interest పంపండి' క్లిక్ చేసిన తర్వాత, ఎదుటి కుటుంబం అంగీకరిస్తేనే (Mutual Accept) ఇరువైపులా అధికారికంగా నంబర్లు వాట్సాప్‌లో మార్పిడి చేయబడతాయి."
                : "🔒 Privacy Policy: To protect family safety and privacy, phone numbers are never displayed publicly. When you send Interest and the other family accepts, contact numbers are securely exchanged on WhatsApp."}
            </p>
            <ol className="mt-3 space-y-1.5 text-[13px] text-rose-900 font-medium">
              <li>1️⃣ {te ? "Interest పంపండి (మొదటి 3 అభ్యర్థనలు ఉచితం - FREE)" : "Send Interest (First 3 requests FREE)"}</li>
              <li>2️⃣ {te ? "అవతలి profile owner accept చేస్తే contact వివరాలు share అవుతాయి" : "Contact details are shared if the other profile owner accepts"}</li>
              <li>3️⃣ {te ? "వారు decline చేస్తే request credit మీ balance కి తిరిగి వస్తుంది" : "If declined, the request credit is returned to your balance"}</li>
            </ol>
            {unlocked ? (
              <div className="mt-4 rounded-2xl bg-emerald-600 p-4 text-center text-white">
                <p className="text-[12px] opacity-90">{te ? "✅ అంగీకారం తర్వాత contact details అందుబాటులో ఉన్నాయి — గౌరవంగా మాట్లాడండి 🙏" : "✅ Contact details are available after acceptance — talk respectfully 🙏"}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-wider">{unlocked}</p>
                <div className="mt-2 flex justify-center gap-2">
                  <a href={normalizedUnlocked ? `tel:+${normalizedUnlocked}` : undefined} aria-disabled={!normalizedUnlocked} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 aria-disabled:pointer-events-none aria-disabled:opacity-50">📞 Call</a>
                  <a href={unlockedWhatsAppUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!unlockedWhatsAppUrl} className="rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white aria-disabled:pointer-events-none aria-disabled:opacity-50">💬 WhatsApp</a>
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => void sendInterest()} disabled={sending}
                className="rounded-xl bg-[#7A0C2E] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {sending ? (te ? "పంపిస్తున్నాం…" : "Sending…") : te ? "💌 Interest పంపండి (FREE 3)" : "💌 Send interest (FREE 3)"}
              </button>
              <button onClick={() => void sendInterest("traditional")} disabled={sending}
                className="rounded-xl border border-[#7A0C2E] px-4 py-2.5 text-sm font-bold text-[#7A0C2E]">
                {te ? "🙏 Template తో పంపు" : "🙏 Send with template"}
              </button>
              {unlocked ? (
                <a href={`tel:${unlocked}`} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">
                  📞 {unlocked} — Call
                </a>
              ) : (
                <>
                <button onClick={() => void doUnlock()} disabled={unlocking}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  {unlocking ? (te ? "చెక్ చేస్తున్నాం…" : "Checking access…") : (te ? "📞 అంగీకారం తర్వాత contact చూడండి" : "📞 Contact after acceptance")}
                </button>
                <a href={SITE_CONFIG.unlockBot(profile.tsap_id)} target="_blank" rel="noreferrer"
                  title={te ? "Telegram లో accepted-interest contact access మాత్రమే చూపుతుంది" : "Telegram contact access requires an accepted interest"}
                  className="rounded-xl gold-gradient px-4 py-2.5 text-sm font-bold text-maroon">
                  📞 {te ? "Contact access (acceptance తర్వాత)" : "Contact access (after acceptance)"}
                </a>
                </>
              )}
              <Link href="/pricing" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
                💳 Paid plans (₹99 → 5 interest requests)
              </Link>
            </div>
          </section>

          {/* actions */}
          <section className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/biodata?id=${profile.tsap_id}`}
              className="rounded-xl gold-gradient px-4 py-2 text-sm font-black text-maroon hover:brightness-105 transition shadow-xs flex items-center gap-1.5"
            >
              <span>🎴</span>
              <span>{te ? "HD కలర్ బయోడేటా JPG" : "HD Color Biodata JPG"}</span>
            </Link>
            <button onClick={printBiodata} className="rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 px-4 py-2 text-sm font-bold text-[#7A0C2E] transition shadow-xs">
              📄 {te ? "ప్రింట్ బయోడేటా" : "Print Biodata"}
            </button>
            <button onClick={() => void toggleSave()}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${savedNow ? "bg-rose-100 text-rose-700" : "border border-slate-300 text-slate-700"}`}>
              {savedNow ? (te ? "❤️ Shortlist లో ఉంది" : "❤️ In shortlist") : "🤍 Shortlist"}
            </button>
            <button onClick={() => setShowProposalModal(true)} className="rounded-xl bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-bold text-white transition flex items-center gap-1.5 shadow-xs">
              <span>💬</span>
              <span>{te ? "వాట్సాప్ ప్రపోజల్ షేర్" : "WhatsApp Proposal Share"}</span>
            </button>
            <button onClick={() => void doBlock()} disabled={blocked} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50">
              🚫 Block
            </button>
            <button onClick={() => void doReport()} disabled={reported} className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-bold text-amber-800 disabled:opacity-50">
              🚩 Report
            </button>
            <Link href="/safety" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">🛡️ Safety tips</Link>
          </section>

          {msg ? (
            <p aria-live="polite" className={`mt-4 rounded-2xl border p-3 text-sm font-semibold ${msg.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
              {msg.text}
            </p>
          ) : null}

          {myTsapId && profile.tsap_id === myTsapId && Object.keys(quality?.sections || {}).length ? (
            <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-800">📝 Your profile fields: {quality?.percent}%</h2>
              <p className="mt-1 text-[11px] text-slate-500">This measures filled fields only; it is not an identity or match score.</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
                {Object.entries(quality.sections as Record<string, Row>).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-slate-50 p-2">
                    <p className="font-semibold capitalize text-slate-700">{k}</p>
                    <p className="text-slate-500">{v.percent}%</p>
                  </div>
                ))}
              </div>
              {Array.isArray(quality.important_telugu) && quality.important_telugu.length ? (
                <p className="mt-2 text-[12px] text-amber-800">{(quality.important_telugu as string[]).slice(0, 3).join(" · ")}</p>
              ) : null}
            </section>
          ) : null}

          <ProfileRail kind="similar" profileId={profile.tsap_id} />

          <p className="mt-4 text-center text-[11px] text-slate-500">
            🔐 {data.consent_note_telugu || (te ? "Contact వివరాలు consent flow లో పంచుకోబడతాయి; స్వతంత్రంగా ధృవీకరించండి. External sharing ను ఈ సైట్ నియంత్రించలదు." : "Contact details follow the consent flow; verify independently. This site cannot control external sharing.")}
          </p>

          {/* Consent-gated contact access and request-credit purchase flow */}
          <QuickUnlockModal
            isOpen={showUnlockModal}
            onClose={() => setShowUnlockModal(false)}
            target={profile.tsap_id ? {
              tsap_id: String(profile.tsap_id),
              full_name: profile.full_name,
              gender: profile.gender,
              age: profile.age,
              caste: profile.caste,
              district: profile.district,
              job: profile.job,
              photo_url: profile.photo_url,
            } : null}
            onUnlocked={(p) => setUnlocked(p)}
          />

          {/* 💌 Direct WhatsApp Proposal Modal */}
          <WhatsAppProposalModal
            isOpen={showProposalModal}
            onClose={() => setShowProposalModal(false)}
            profile={profile.tsap_id ? {
              tsap_id: String(profile.tsap_id),
              full_name: profile.full_name,
              gender: profile.gender,
              age: profile.age,
              height: profile.height,
              caste: profile.caste,
              sub_caste: profile.sub_caste,
              gothram: profile.gothram,
              star: profile.star,
              rasi: profile.rasi,
              education: profile.education,
              job: profile.job,
              company: profile.company,
              salary: profile.salary,
              district: profile.district,
              state: profile.state,
              marital_status: profile.marital_status,
              father_name: profile.father_name,
              photo_url: profile.photo_url,
            } : null}
          />
        </>
      ) : null}
    </div>
  );
}
