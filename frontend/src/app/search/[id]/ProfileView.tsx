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
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ProfileSkeleton } from "@/components/Skeletons";
import AuthGate from "@/components/AuthGate";
import RasiChart from "@/components/RasiChart";
import { apiDisplayMessage, apiGet, apiPost, authHeaders } from "@/lib/api";
import { normalizeWhatsAppPhone, whatsappPhoneLink } from "@/lib/wa";
import { firstName } from "@/lib/names";
import { useLang } from "@/lib/lang";
import { SITE_CONFIG } from "@/lib/site-config";
import { isNeverMarriedStatus, stateFullName } from "@/lib/telugu-data";
import ProfileRail from "@/components/ProfileRail";
import QuickUnlockModal from "@/components/QuickUnlockModal";
import WhatsAppProposalModal from "@/components/WhatsAppProposalModal";
import VoiceBiodataPlayer from "@/components/VoiceBiodataPlayer";
import RequestCoach from "@/components/RequestCoach";
import ProfileInsights from "@/components/ProfileInsights";
import RequestTimeline from "@/components/RequestTimeline";

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

export default function ProfileView() {
  const { lang } = useLang();
  const te = lang === "te";
  const localizedApiMessage = (payload: unknown, fallbackTe: string, fallbackEn: string) => {
    const record = payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {};
    return apiDisplayMessage({ ...record, message_en: record.message_en || fallbackEn }, te, te ? fallbackTe : fallbackEn);
  };
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
  const [interestNote, setInterestNote] = useState("");
  const [sentRequestId, setSentRequestId] = useState("");

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

  const profile: Row = useMemo(() => data?.profile || {}, [data?.profile]);
  const rawChildren = String(profile.children ?? "").trim();
  const noChildrenValue = /^(none|0|no|no children|పిల్లలు లేరు)$/i.test(rawChildren);
  // Legacy records/drafts can contain a stale child count; never-married profiles never show it.
  const showChildrenDetail = !isNeverMarriedStatus(profile.marital_status);
  const profileText = useCallback((value: unknown, fallback = "—") => {
    const text = String(value ?? "").trim();
    if (!text) return fallback;
    return te ? text : apiDisplayMessage({ message_en: text }, false, fallback) || fallback;
  }, [te]);
  const displayChildren = noChildrenValue ? (te ? "లేరు" : "No children") : profileText(rawChildren);

  useEffect(() => {
    if (!data?.profile) return;
    const englishTerm = (value: unknown) => profileText(value, "");
    const name = String(profile.full_name || profile.name || (te ? "సభ్యుల ప్రొఫైల్" : "Member profile")).trim();
    const facts = [
      profile.age ? `${profile.age} ${te ? "సంవత్సరాలు" : "years"}` : "",
      te ? profile.caste : englishTerm(profile.caste),
      te ? profile.education : englishTerm(profile.education),
      te ? profile.job : englishTerm(profile.job),
      te ? profile.district : englishTerm(profile.district),
    ].filter(Boolean);
    const brand = te ? "మన వివాహ (Mana Vivaha)" : "Mana Vivaha (మన వివాహ)";
    const title = `${name} (${searchId})${facts.length ? ` — ${facts.join(" • ")}` : ""} | ${brand}`;
    const description = te
      ? "సభ్యులు అందించిన వివాహ ప్రొఫైల్. వివరాలు స్వతంత్రంగా ధృవీకరించబడవు; ప్రొఫైల్ యజమాని అంగీకరించిన తర్వాతే ఖాతా పేజీల్లో సంప్రదింపు వివరాలు అందుబాటులో ఉంటాయి."
      : `${facts.length ? `${facts.join(" • ")}. ` : ""}Member-submitted profile. Details are not independently verified; contact details are available in account views only after profile-owner acceptance.`;
    document.title = title;
    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:locale", te ? "te_IN" : "en_IN");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
  }, [data, profile, searchId, te, profileText]);

  const quality = (data?.quality as Row) || null;
  const importantNotes = te ? quality?.important_telugu : quality?.important_en;

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

  const sendInterest = async (templateId?: string, noteOverride?: string) => {
    setSending(true); setMsg(null);
    const noteToSend = (noteOverride ?? (interestNote || "")).trim();
    const { ok, data: d, status, errorTelugu: eTel, needsLogin: nl } = await apiPost<Row>("/api/interest/send",
      { from_id: myTsapId, to_id: searchId, channel: "search_page",
        ...(noteToSend ? { note: noteToSend } : {}),
        ...(templateId ? { template_id: templateId } : {}) });
    setSending(false);
    if (nl) { setNeedsLogin(true); return; }
    if (ok) {
      const rid = String((d as Row | null)?.request_id || "");
      if (rid) setSentRequestId(rid);
      setInterestNote("");
      setMsg({ ok: true, text: localizedApiMessage(d, "Interest పంపించారు. Owner అంగీకారం తర్వాత account views లో contact details కనిపిస్తాయి; notification delivery హామీ లేదు.", "Interest sent. Contact details appear in account views after owner acceptance; notification delivery is not confirmed.") });
        }
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
      setMsg({ ok: true, text: localizedApiMessage(d, "✅ అంగీకారం తర్వాత contact details అందుబాటులో ఉన్నాయి.", "✅ Contact details are available after acceptance.") });
    } else {
      setShowUnlockModal(true);
      setMsg({ ok: false, text: eTel || localizedApiMessage(d, "Contact access అందుబాటులో లేదు.", "Contact access is not available.") });
    }
  };

  const toggleSave = async () => {
    const { ok, data: d, needsLogin: nl, errorTelugu: eTel } = await apiPost<Row>("/api/save", { tsap_id: myTsapId, target_id: searchId });
    if (nl) { setNeedsLogin(true); return; }
    if (!ok) { setMsg({ ok: false, text: eTel }); return; }
    setSavedNow(!!d?.saved);
    setMsg({ ok: true, text: localizedApiMessage(d, "షార్ట్‌లిస్ట్ నవీకరించబడింది.", "Shortlist updated.") });
  };

  const doBlock = async () => {
    const { ok, data: d, needsLogin: nl, errorTelugu: eTel } = await apiPost<Row>("/api/block", { tsap_id: myTsapId, block_id: searchId, reason: "profile page నుంచి" });
    if (nl) { setNeedsLogin(true); return; }
    if (ok) { setBlocked(true); setMsg({ ok: true, text: localizedApiMessage(d, "ప్రొఫైల్ బ్లాక్ చేయబడింది.", "Profile blocked.") }); }
    else setMsg({ ok: false, text: eTel });
  };

  const doReport = async () => {
    const { ok, data: d, needsLogin: nl, errorTelugu: eTel } = await apiPost<Row>("/api/report", { reporter_id: myTsapId, target_id: searchId, category: "fake_profile", detail: "Profile page నుంచి report" });
    if (nl) { setNeedsLogin(true); return; }
    if (ok) { setReported(true); setMsg({ ok: true, text: localizedApiMessage(d, "రిపోర్ట్ సమర్పించబడింది. సమీక్షకు పట్టే సమయం మారవచ్చు.", "Report submitted. Review timing may vary.") }); }
    else setMsg({ ok: false, text: eTel });
  };

  const shareWhatsApp = () => {
    if (!profile?.tsap_id) return;
    const details = [
      profile.age != null && String(profile.age).trim() ? `${profile.age}y` : "",
      profileText(profile.height, ""),
      profileText(profile.caste, ""),
      profileText(profile.education, ""),
      profileText(profile.job, ""),
      profileText(profile.district, ""),
      profile.state ? stateFullName(profile.state, te) : "",
      profileText(profile.salary, ""),
    ].filter((value) => String(value || "").trim());
    const text = [
      te
        ? `🙏 మన వివాహ (Mana Vivaha) ప్రొఫైల్ — ${firstName(profile.full_name)} (${profile.tsap_id})`
        : `🙏 Mana Vivaha profile — ${firstName(profile.full_name)} (${profile.tsap_id})`,
      details.length ? details.join(" • ") : "",
      te
        ? "🔒 Contact details యజమాని అంగీకారం తర్వాత మాత్రమే కనిపిస్తాయి. ప్రొఫైల్ వివరాలను స్వతంత్రంగా నిర్ధారించండి."
        : "🔒 Contact details are shared only after the profile owner accepts. Verify profile information independently.",
      `${te ? "పూర్తి వివరాలు" : "Full details"}: ${SITE_CONFIG.siteUrl.replace(/\/+$/, "")}/search/${encodeURIComponent(String(profile.tsap_id))}`,
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
    const field = (value: unknown, fallback = "—") => e(profileText(value, fallback));
    const nameOrId = e(profile.full_name || profile.tsap_id);
    const tsapId = e(profile.tsap_id);
    const copy = te ? {
      pageTitle: "వివాహ బయోడేటా",
      title: "వివాహ పరిచయ పత్రం",
      subtitle: "తెలుగు మ్యాట్రిమోనీ · తెలంగాణ మరియు ఆంధ్రప్రదేశ్",
      name: "పేరు",
      ageHeight: "వయస్సు / ఎత్తు",
      community: "కులం / ఉపకులం",
      gothram: "గోత్రం",
      starSign: "నక్షత్రం / రాశి",
      education: "విద్య",
      occupation: "ఉద్యోగం / వృత్తి",
      salary: "వార్షిక ఆదాయం",
      location: "ప్రాంతం",
      maritalStatus: "వైవాహిక స్థితి",
      family: "కుటుంబ నేపథ్యం",
      dosham: "కుజ దోషం",
      about: "సభ్యుడు అందించిన పరిచయం:",
      footer: "సభ్యులు అందించిన వివరాలు. స్వతంత్రంగా నిర్ధారించండి.",
      years: "సం.",
    } : {
      pageTitle: "Marriage Biodata",
      title: "Marriage Profile",
      subtitle: "Telugu Matrimony · Telangana & Andhra Pradesh",
      name: "Name",
      ageHeight: "Age / height",
      community: "Community / sub-community",
      gothram: "Gothram",
      starSign: "Nakshatra / moon sign",
      education: "Education",
      occupation: "Occupation / work",
      salary: "Annual income",
      location: "Location",
      maritalStatus: "Marital status",
      family: "Family background",
      dosham: "Manglik status",
      about: "Member-provided introduction:",
      footer: "Member-submitted details; verify independently.",
      years: "years",
    };
    const brand = te ? "మన వివాహ (Mana Vivaha)" : "Mana Vivaha (మన వివాహ)";
    const locationValue = [profileText(profile.district, ""), profile.state ? stateFullName(profile.state, te) : ""]
      .filter(Boolean).join(", ") || "—";
    const ageValue = profile.age != null && String(profile.age).trim()
      ? `${e(profile.age)} ${copy.years}`
      : "—";
    const html = `<!DOCTYPE html>
<html lang="${te ? "te-IN" : "en-IN"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${e(copy.pageTitle)} — ${nameOrId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #1e293b; padding: 24px; }
    .card { max-width: 650px; margin: 0 auto; border: 4px double #7A0C2E; border-radius: 16px; padding: 24px; background: #fffdfa; }
    .header { text-align: center; border-bottom: 2px solid #D4AF37; padding-bottom: 16px; margin-bottom: 20px; }
    .title { color: #7A0C2E; font-size: 24px; font-weight: bold; margin: 0; }
    .sub { color: #8B6914; font-size: 13px; margin-top: 4px; font-weight: 600; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
    .item { background: #fff; padding: 10px 14px; border: 1px solid #fed7aa; border-radius: 8px; }
    .label { font-size: 11px; color: #64748b; font-weight: bold; }
    .val { font-size: 14px; color: #0f172a; font-weight: bold; margin-top: 2px; overflow-wrap: anywhere; }
    .about { margin-top: 16px; padding: 12px; background: #fff; border: 1px solid #fed7aa; border-radius: 8px; font-size: 13px; line-height: 1.5; }
    .footer { text-align: center; margin-top: 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 12px; }
    @media print { body { padding: 0; } .card { max-width: none; border-radius: 0; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="title">💍 ${brand} — ${e(copy.title)}</div>
      <div class="sub">${e(copy.subtitle)} · ID: ${tsapId}</div>
    </div>
    <div class="grid">
      <div class="item"><div class="label">${e(copy.name)}</div><div class="val">${nameOrId}</div></div>
      <div class="item"><div class="label">${e(copy.ageHeight)}</div><div class="val">${ageValue} · ${field(profile.height)}</div></div>
      <div class="item"><div class="label">${e(copy.community)}</div><div class="val">${field(profile.caste)} ${profileText(profile.sub_caste, "") ? `(${field(profile.sub_caste, "")})` : ""}</div></div>
      <div class="item"><div class="label">${e(copy.gothram)}</div><div class="val">${field(profile.gothram)}</div></div>
      <div class="item"><div class="label">${e(copy.starSign)}</div><div class="val">${field(profile.star)} / ${field(profile.rasi)}</div></div>
      <div class="item"><div class="label">${e(copy.education)}</div><div class="val">${field(profile.education)} ${field(profile.education_detail, "")}</div></div>
      <div class="item"><div class="label">${e(copy.occupation)}</div><div class="val">${field(profile.job)} ${profileText(profile.company, "") ? `@ ${field(profile.company, "")}` : ""}</div></div>
      <div class="item"><div class="label">${e(copy.salary)}</div><div class="val">${field(profile.salary)}</div></div>
      <div class="item"><div class="label">${e(copy.location)}</div><div class="val">${e(locationValue)}</div></div>
      <div class="item"><div class="label">${e(copy.maritalStatus)}</div><div class="val">${field(profile.marital_status)}</div></div>
      <div class="item"><div class="label">${e(copy.family)}</div><div class="val">${field(profile.family_type)} · ${field(profile.family_status)}</div></div>
      <div class="item"><div class="label">${e(copy.dosham)}</div><div class="val">${field(profile.dosham)}</div></div>
    </div>
    ${profile.about_myself ? `<div class="about"><b>${e(copy.about)}</b> ${field(profile.about_myself, te ? "" : "English version not available.")}</div>` : ""}
    <div class="footer">
      ${e(copy.footer)} · ${e(SITE_CONFIG.domain)}/search/${tsapId}
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
          <button type="button" onClick={() => void load(searchId.trim())} className="rounded-xl bg-[#7A0C2E] px-3 py-1.5 text-[12px] font-bold text-white min-h-11">{te ? "చూడు" : "View"}</button>
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
                <h1 className="text-2xl font-extrabold text-[#7A0C2E]">{myTsapId && profile.tsap_id === myTsapId ? (profile.full_name || (te ? "ప్రొఫైల్" : "Profile")) : firstName(profile.full_name)}</h1>
                <p className="font-mono text-[12px] text-slate-500">{profile.tsap_id}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  {profile.phone_verified
                    ? <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800" title={te ? "OTP ఈ phone number వినియోగాన్ని మాత్రమే నిర్ధారిస్తుంది; identity లేదా profile వివరాలను కాదు." : "OTP confirms access to this phone number only, not identity or other profile details."}>{te ? "✅ ఫోన్ OTP నమోదు" : "✅ Phone OTP recorded"}</span>
                    : <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-slate-600" title={te ? "ఈ phone number కు OTP check నమోదు కాలేదు" : "No phone OTP check is recorded for this number"}>{te ? "ఫోన్ OTP నమోదు కాలేదు" : "Phone OTP not recorded"}</span>}
                  {profile.id_verified ? <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 font-extrabold text-blue-800" title={te ? "ప్రభుత్వ ID ను staff manual గా పరిశీలించారు; ఇది ఇతర వివరాలను ధృవీకరించదు" : "Government ID manually reviewed by staff; this does not verify other profile details"}>🪪 {te ? "ప్రభుత్వ ID సమీక్ష" : "Government ID reviewed"}</span> : null}
                  {profile.selfie_verified ? <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800" title={te ? "సెల్ఫీ చిత్రం staff review లో ఆమోదించబడింది; ఇది liveness check కాదు" : "Selfie image approved in staff review; this is not a liveness check"}>🤳 {te ? "సెల్ఫీ సమీక్ష" : "Selfie reviewed"}</span> : null}
                  {profile.boosted ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">⚡ {te ? "బూస్ట్ చేయబడింది" : "Boosted"}</span> : null}
                  {profile.is_nri ? <span className="rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 font-semibold text-sky-800">✈️ NRI{profile.country && profileText(profile.country, "") !== "India" ? ` • ${profileText(profile.country, "")}` : ""}</span> : null}
                  {profile.profession_label && profileText(profile.profession_label, "") ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-semibold text-amber-800">{profileText(profile.profession_label, "")}</span> : null}
                </div>
              </div>
              <div className="shrink-0 rounded-2xl bg-rose-50 px-3 py-2 text-center">
                <p className="text-lg font-extrabold text-[#7A0C2E]">{quality?.percent ?? 0}%</p>
                <p className="text-[10px] text-slate-500">{te ? "ప్రొఫైల్ పూర్తి" : "Profile complete"}</p>
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
                [te ? "🎂 వయస్సు" : "🎂 Age", profile.age != null && String(profile.age).trim() ? `${profile.age} ${te ? "సం." : "years"}` : "—"],
                [te ? "📏 ఎత్తు" : "📏 Height", profileText(profile.height)],
                [te ? "🕉️ కులం / ఉపకులం" : "🕉️ Community / sub-community", `${profileText(profile.caste)}${profileText(profile.sub_caste, "") ? ` (${profileText(profile.sub_caste, "")})` : ""}`],
                [te ? "🎓 చదువు" : "🎓 Education", `${profileText(profile.education)}${profileText(profile.education_detail, "") ? ` ${profileText(profile.education_detail, "")}` : ""}`],
                [te ? "💼 ఉద్యోగం" : "💼 Occupation", `${profileText(profile.job)}${profileText(profile.company, "") ? ` @ ${profileText(profile.company, "")}` : ""}`],
                [te ? "💰 ఆదాయం" : "💰 Income", profileText(profile.salary)],
                [te ? "📍 ప్రాంతం" : "📍 Location", `${profileText(profile.district)}, ${profile.state ? stateFullName(profile.state, te) : "—"}`],
                [te ? "⭐ నక్షత్రం / రాశి (సూచన)" : "⭐ Nakshatra / moon sign (reference)", `${profileText(profile.star)} / ${profileText(profile.rasi)}`],
                [te ? "💍 వైవాహిక స్థితి" : "💍 Marital status", profileText(profile.marital_status)],
                ...(showChildrenDetail ? [[te ? "👶 పిల్లలు" : "👶 Children", displayChildren]] : []),
                [te ? "🕉️ గోత్రం (సూచన)" : "🕉️ Gothram (reference)", profileText(profile.gothram)],
                [te ? "👨‍👩‍👧 కుటుంబం" : "👨‍👩‍👧 Family", `${profileText(profile.family_type)} · ${profileText(profile.family_status)}`],
                [te ? "🧿 కుజ దోషం" : "🧿 Manglik status", profileText(profile.dosham)],
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
                <p className="mt-1 text-[13px] text-slate-700">{te ? profile.about_myself : apiDisplayMessage(profile.about_myself, false, "This member-provided description is available only in the language submitted.")}</p>
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
                    {data.observations.slice(0, 4).map((item: string, i: number) => <li key={`observation-${i}`}>{te ? item : apiDisplayMessage(item, false, "This detail is not available in English.")}</li>)}
                  </ul>
                )}
                {Array.isArray(data.differences) && data.differences.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-slate-700">
                    {data.differences.slice(0, 4).map((item: string, i: number) => <li key={`difference-${i}`}>{te ? item : apiDisplayMessage(item, false, "This detail is not available in English.")}</li>)}
                  </ul>
                )}
                {Array.isArray(data.preference_checks) && data.preference_checks.length > 0 && (
                  <div className="mt-3 space-y-1 border-t border-slate-200 pt-2">
                    <p className="text-[11px] font-bold text-slate-700">{te ? "మీరు నమోదు చేసిన preferences" : "Your explicitly saved preferences"}</p>
                    {data.preference_checks.slice(0, 4).map((item: Row, i: number) => (
                      <p key={`preference-${i}`} className="text-[11px] text-slate-600">{te ? (item.note_te || item.note || item.label || item.status) : apiDisplayMessage({ message_en: item.note_en || item.label_en || item.status_en, message: item.note || item.label || item.status }, false, "Your saved preference details are not available in English.")}</p>
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

          {myTsapId && searchId && myTsapId !== searchId ? (
            <RequestCoach fromId={myTsapId} toId={searchId} onPickNote={(text) => setInterestNote(text)} />
          ) : null}
          {myTsapId && searchId && myTsapId !== searchId ? (
            <ProfileInsights viewerId={myTsapId} profileId={searchId} />
          ) : null}

          {/* 🔒 Contact access is gated by profile-owner acceptance */}
          <section className="mt-4 rounded-3xl border-2 border-rose-300 bg-rose-50 p-5">
            <h2 className="text-lg font-extrabold text-[#7A0C2E]">
              🔒 {te ? "ఫోన్ నంబర్ — •••••••••• (గోప్యతా రక్షణలో ఉంది)" : "Phone Number — •••••••••• (Protected & Locked)"}
            </h2>
            <p className="mt-1 text-[13px] text-rose-900 leading-relaxed">
              {te
                ? "🔒 Public profile/search లో phone number చూపించము. Owner accept చేసిన తర్వాత accepted-request account views లో contact details కనిపిస్తాయి; configured WhatsApp notification లో కూడా ఉండవచ్చు. Queue/send status delivery/read confirmation కాదు."
                : "🔒 Phone numbers are not shown in public profile/search. After owner acceptance, contact details appear in accepted-request account views and may also be included in a configured WhatsApp notification. Queue/send status does not confirm delivery or reading."}
            </p>
            <ol className="mt-3 space-y-1.5 text-[13px] text-rose-900 font-medium">
              <li>1️⃣ {te ? "Interest పంపండి (మొదటి 3 అభ్యర్థనలు ఉచితం - FREE)" : "Send Interest (First 3 requests FREE)"}</li>
              <li>2️⃣ {te ? "Owner accept చేసిన తర్వాత contact details account views లో కనిపిస్తాయి" : "Contact details appear in account views after owner acceptance"}</li>
              <li>3️⃣ {te ? "Decline credit return మీ account policy ప్రకారం ఉంటుంది" : "Any decline credit return follows your account policy"}</li>
            </ol>
            {unlocked ? (
              <div className="mt-4 rounded-2xl bg-emerald-600 p-4 text-center text-white">
                <p className="text-[12px] opacity-90">{te ? "✅ Owner acceptance తర్వాత contact access అందుబాటులో ఉంది. Calls/messages మీ ఎంపిక; external delivery హామీ లేదు." : "✅ Contact access is available after owner acceptance. Calls/messages are your choice; external delivery is not guaranteed."}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-wider">{unlocked}</p>
                <div className="mt-2 flex justify-center gap-2">
                  <a href={normalizedUnlocked ? `tel:+${normalizedUnlocked}` : undefined} aria-disabled={!normalizedUnlocked} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700 aria-disabled:pointer-events-none aria-disabled:opacity-50">📞 {te ? "కాల్ చేయండి" : "Call"}</a>
                  <a href={unlockedWhatsAppUrl || undefined} target="_blank" rel="noopener noreferrer" aria-disabled={!unlockedWhatsAppUrl} className="rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white aria-disabled:pointer-events-none aria-disabled:opacity-50">💬 WhatsApp</a>
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void sendInterest()} disabled={sending}
                className="rounded-xl bg-[#7A0C2E] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {sending ? (te ? "పంపిస్తున్నాం…" : "Sending…") : te ? "💌 Interest పంపండి (FREE 3)" : "💌 Send interest (FREE 3)"}
              </button>
              <button type="button" onClick={() => void sendInterest("traditional")} disabled={sending}
                className="rounded-xl border border-[#7A0C2E] px-4 py-2.5 text-sm font-bold text-[#7A0C2E]">
                {te ? "🙏 Template తో పంపు" : "🙏 Send with template"}
              </button>
              {unlocked ? (
                <a href={normalizedUnlocked ? `tel:+${normalizedUnlocked}` : undefined} aria-disabled={!normalizedUnlocked} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">
                  📞 {unlocked} — {te ? "కాల్" : "Call"}
                </a>
              ) : (
                <>
                <button type="button" onClick={() => void doUnlock()} disabled={unlocking}
                  className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                  {unlocking ? (te ? "చెక్ చేస్తున్నాం…" : "Checking access…") : (te ? "📞 అంగీకారం తర్వాత contact చూడండి" : "📞 Contact after acceptance")}
                </button>
                </>
              )}
              <Link href="/pricing" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
                💳 {te ? "పెయిడ్ ప్లాన్‌లు (₹99 → 5 interest requests)" : "Paid plans (₹99 → 5 interest requests)"}
              </Link>
            </div>
          </section>

          {myTsapId && myTsapId !== searchId ? (
            <section className="mx-auto mt-4 max-w-3xl px-4" aria-label={te ? "పంపే సందేశం" : "Message to send"}>
              <label className="block text-[11px] font-bold text-slate-700" htmlFor="interest-note">
                {te ? "✍️ పంపే సందేశం (optional — మీరు నమోదు చేసిన వివరాల ఆధారంగానే సూచనలు)" : "✍️ Message to send (optional — suggestions come only from entered details)"}
              </label>
              <textarea
                id="interest-note"
                value={interestNote}
                onChange={(event) => setInterestNote(event.target.value.slice(0, 280))}
                rows={3}
                maxLength={280}
                placeholder={te ? "ఉదా: మీ profile చూశాను — వివరాలు నాకు సరిపోయాయి." : "e.g. I read your profile and the details suit what I am looking for."}
                className="mt-1.5 w-full rounded-2xl border border-slate-300 bg-white p-3 text-[13px] text-slate-800 focus:border-[#7A0C2E] focus:outline-none"
              />
            </section>
          ) : null}

          {sentRequestId ? <RequestTimeline requestId={sentRequestId} /> : null}

          {/* actions */}
          <section className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/biodata?id=${profile.tsap_id}`}
              className="rounded-xl gold-gradient px-4 py-2 text-sm font-black text-maroon hover:brightness-105 transition shadow-xs flex items-center gap-1.5"
            >
              <span>🎴</span>
              <span>{te ? "HD కలర్ బయోడేటా JPG" : "HD Color Biodata JPG"}</span>
            </Link>
            <button type="button" onClick={printBiodata} className="rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 px-4 py-2 text-sm font-bold text-[#7A0C2E] transition shadow-xs">
              📄 {te ? "ప్రింట్ బయోడేటా" : "Print Biodata"}
            </button>
            <button type="button" onClick={() => void toggleSave()}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${savedNow ? "bg-rose-100 text-rose-700" : "border border-slate-300 text-slate-700"}`}>
              {savedNow ? (te ? "❤️ షార్ట్‌లిస్ట్‌లో ఉంది" : "❤️ In shortlist") : (te ? "🤍 షార్ట్‌లిస్ట్" : "🤍 Shortlist")}
            </button>
            <button type="button" onClick={() => setShowProposalModal(true)} className="rounded-xl bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-bold text-white transition flex items-center gap-1.5 shadow-xs">
              <span>💬</span>
              <span>{te ? "వాట్సాప్ ప్రపోజల్ షేర్" : "WhatsApp Proposal Share"}</span>
            </button>
            <button type="button" onClick={() => void doBlock()} disabled={blocked} className="rounded-xl border border-rose-300 px-4 py-2 text-sm font-bold text-rose-700 disabled:opacity-50">
              🚫 {te ? "బ్లాక్ చేయండి" : "Block"}
            </button>
            <button type="button" onClick={() => void doReport()} disabled={reported} className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-bold text-amber-800 disabled:opacity-50">
              🚩 {te ? "రిపోర్ట్ చేయండి" : "Report"}
            </button>
            <Link href="/safety" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">🛡️ {te ? "భద్రతా సూచనలు" : "Safety tips"}</Link>
          </section>

          {msg ? (
            <p aria-live="polite" className={`mt-4 rounded-2xl border p-3 text-sm font-semibold ${msg.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
              {msg.text}
            </p>
          ) : null}

          {myTsapId && profile.tsap_id === myTsapId && Object.keys(quality?.sections || {}).length ? (
            <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-800">📝 {te ? `మీ ప్రొఫైల్ వివరాలు: ${quality?.percent}%` : `Your profile fields: ${quality?.percent}%`}</h2>
              <p className="mt-1 text-[11px] text-slate-500">{te ? "ఇది నింపిన ఫీల్డ్‌ల శాతం మాత్రమే; గుర్తింపు లేదా జత సరిపోలిక స్కోరు కాదు." : "This measures completed fields only; it is not an identity or compatibility score."}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px] sm:grid-cols-4">
                {Object.entries(quality.sections as Record<string, Row>).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-slate-50 p-2">
                    <p className="font-semibold capitalize text-slate-700">{k}</p>
                    <p className="text-slate-500">{v.percent}%</p>
                  </div>
                ))}
              </div>
              {Array.isArray(importantNotes) && importantNotes.length ? (
                <p className="mt-2 text-[12px] text-amber-800">{(importantNotes as string[]).slice(0, 3).join(" · ")}</p>
              ) : null}
            </section>
          ) : null}

          <ProfileRail kind="similar" profileId={profile.tsap_id} />

          <p className="mt-4 text-center text-[11px] text-slate-500">
            🔐 {te
              ? (data.consent_note_telugu || "Contact వివరాలు consent flow తర్వాత మాత్రమే పంచుకోబడతాయి; స్వతంత్రంగా ధృవీకరించండి.")
              : apiDisplayMessage({ message_en: data.consent_note_en, message: data.consent_note, message_telugu: data.consent_note_telugu }, false, "Contact details follow the consent flow. Verify independently; this site cannot control external sharing.")}
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
