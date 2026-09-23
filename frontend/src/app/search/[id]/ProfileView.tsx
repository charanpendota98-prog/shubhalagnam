"use client";
/**
 * 👁️ /search/[id] — PROFILE VIEW (WAVE 9 rewrite)
 * ===============================================
 * 🐞 FIXES (mundu unna bugs):
 *   • HARDCODED fake profile (Lakshmi Reddy + phone "9848012345") — tappu ID ki kooda ade kanipinchedu
 *   • "Number Chudu 1 Credit" button — kani backend aa number eppudu ivvadu (fake promise)
 *   • Credit locally deduct ayyedi (server ki telidu) → balance mismatch
 *   • ✅ Ippudu: real /api/search/{id} data, 404 honest, 🔒 consent-based unlock, quality + trust,
 *     block/report wired, shortlist + interest token tho.
 */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import TrustBadge from "@/components/TrustBadge";
import { ProfileSkeleton } from "@/components/Skeletons";
import AuthGate from "@/components/AuthGate";
import RasiChart from "@/components/RasiChart";
import { apiGet, apiPost, authHeaders, getToken } from "@/lib/api";
import { SITE_CONFIG } from "@/lib/site-config";
import { firstName } from "@/lib/names";
import { Duo, duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import ProfileRail from "@/components/ProfileRail";

type Row = Record<string, any>;

const CONSENT_STEPS_TE = [
  "1️⃣ Interest పంపండి (FREE 3 requests) — వాళ్లకి మీ profile WhatsApp లో వెళ్తుంది",
  "2️⃣ వాళ్లు accept చేస్తే — రెండు వైపులా numbers WhatsApp లో exchange (consent)",
  "3️⃣ అప్పుడు మాట్లాడుకోండి — మన side నుంచి మధ్యస్థం కూడా ఉంది",
];
const CONSENT_STEPS_EN = [
  "1️⃣ Send Interest (FREE 3 requests) — they get your profile on WhatsApp",
  "2️⃣ If they accept — numbers exchange on WhatsApp both sides (consent)",
  "3️⃣ Then talk — our mediation support stays available",
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
  const [compat, setCompat] = useState<Row | null>(null);
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

  useEffect(() => {
    if (!myTsapId || !searchId || myTsapId === searchId) { setCompat(null); return; }
    void apiGet<Row>(`/api/match/score?a=${encodeURIComponent(myTsapId)}&b=${encodeURIComponent(searchId)}`).then(({ ok, data }) => {
      setCompat(ok && data && typeof data.score === "number" ? data : null);
    });
  }, [myTsapId, searchId]);

  const profile: Row = data?.profile || {};
  const trust = (data?.trust as Row) || null;
  const quality = (data?.quality as Row) || null;

  const load = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true); setErr(""); setMsg(null);
    const { ok, status, data: d, errorTelugu } = await apiGet<Row>(`/api/search/${encodeURIComponent(id)}`);
    setLoading(false);
    if (!ok || !d) {
      setData(null);
      setErr(status === 404 ? (te ? `🔍 Profile ID దొరకలేదు: ${id} — ID correct గా ఉందా check చెయ్యండి (register అయ్యారా?)` : `🔍 Profile ID not found: ${id} — check the ID is correct (registered?)`) : errorTelugu);
      return;
    }
    setData(d);
  }, []);

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
    if (ok) setMsg({ ok: true, text: String(d?.message_telugu || (te ? "Interest పంపించారు ✅ — accept అయితే numbers exchange" : "Interest sent ✅ — numbers exchange on accept")) });
    else if (status === 402) setMsg({ ok: false, text: te ? "⚠️ Credits అయిపోయాయి — ₹99 → 5 profiles. Numbers కూడా accept తోనే (consent)." : "⚠️ Credits over — ₹99 → 5 profiles. Numbers also only with accept (consent)." });
    else if (status === 404) setMsg({ ok: false, text: te ? "మీ Profile ID register చెయ్యలేదు — ముందు FREE register చెయ్యండి." : "Your Profile ID is not registered — FREE register first." });
    else setMsg({ ok: false, text: eTel });
  };

  const doUnlock = async () => {
    if (!myTsapId) { setNeedsLogin(true); return; }
    setUnlocking(true); setMsg(null);
    const { ok, data: d, needsLogin: nl, errorTelugu: eTel } = await apiPost<Row>("/api/unlock",
      { viewer_id: myTsapId, target_id: searchId });
    setUnlocking(false);
    if (nl) { setNeedsLogin(true); return; }
    if (ok && d?.success) {
      setUnlocked(String(d.phone || ""));
      setMsg({ ok: true, text: String(d.message_telugu || (te ? "✅ Number unlock అయ్యింది!" : "✅ Number unlocked!")) });
    } else {
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
    if (ok) { setReported(true); setMsg({ ok: true, text: String(d?.message_telugu || d?.ack_telugu || (te ? "Report పంపాం — team 48h లో చూస్తుంది" : "Report sent — team reviews in 48h")) }); }
    else setMsg({ ok: false, text: eTel });
  };

  const shareWhatsApp = () => {
    if (!profile) return;
    const text = `🙏 మన వివాహ profile — ${firstName(profile.full_name)} (${profile.tsap_id})\n` +
      `${profile.age}y • ${profile.height || "—"} • ${profile.caste} • ${profile.education} • ${profile.job}\n` +
      `📍 ${profile.district}, ${profile.state} • 💰 ${profile.salary}\n` +
      `🔒 Number locked — ${te ? "interest accept అయితే exchange" : "exchange on interest accept"}\n` +
      `Full details: ${window.location.origin}/search/${profile.tsap_id}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const printBiodata = () => {
    if (!profile) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) { window.print(); return; }
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>వివాహ బయోడేటా — ${profile.full_name || profile.tsap_id}</title>
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
      <div class="title">💍 శుభలగ్నం — వివాహ పరిచయ పత్రం</div>
      <div class="sub">MANA VIVAHA • TS & AP TELUGU MATRIMONY (ID: ${profile.tsap_id})</div>
    </div>
    <div class="grid">
      <div class="item"><div class="label">పేరు (Name)</div><div class="val">${profile.full_name || profile.tsap_id}</div></div>
      <div class="item"><div class="label">వయస్సు & ఎత్తు (Age & Height)</div><div class="val">${profile.age} సం॥ · ${profile.height || "—"}</div></div>
      <div class="item"><div class="label">కులం & ఉపకులం (Caste)</div><div class="val">${profile.caste || "—"} ${profile.sub_caste ? `(${profile.sub_caste})` : ""}</div></div>
      <div class="item"><div class="label">గోత్రం (Gothram)</div><div class="val">${profile.gothram || "—"}</div></div>
      <div class="item"><div class="label">నక్షత్రం & రాశి (Star & Sign)</div><div class="val">${profile.star || "—"} / ${profile.rasi || "—"}</div></div>
      <div class="item"><div class="label">చదువు (Education)</div><div class="val">${profile.education || "—"} ${profile.education_detail || ""}</div></div>
      <div class="item"><div class="label">ఉద్యోగం / వ్యాపారం (Job)</div><div class="val">${profile.job || "—"} ${profile.company ? `@ ${profile.company}` : ""}</div></div>
      <div class="item"><div class="label">వార్షిక ఆదాయం (Annual Salary)</div><div class="val">${profile.salary || "—"}</div></div>
      <div class="item"><div class="label">ప్రాంతం / నివాసం (Location)</div><div class="val">${profile.district || "—"}, ${profile.state || "—"}</div></div>
      <div class="item"><div class="label">వైవాహిక స్థితి (Marital Status)</div><div class="val">${profile.marital_status || "Never Married"}</div></div>
      <div class="item"><div class="label">కుటుంబ నేపథ్యం (Family)</div><div class="val">${profile.family_type || "Joint/Nuclear"} · ${profile.family_status || "Middle/Upper"}</div></div>
      <div class="item"><div class="label">దోషం (Dosham)</div><div class="val">${profile.dosham || "None"}</div></div>
    </div>
    ${profile.about_myself ? `<div class="about"><b>స్వవిషయం (About):</b> ${profile.about_myself}</div>` : ""}
    <div class="footer">
      🔒 100% Verified TS & AP Matrimony Profile · manavivaha.in/search/${profile.tsap_id}
    </div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center gap-2">
        <Link href="/matches" className="text-[12px] font-bold text-[#7A0C2E]">← Matches</Link>
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-rose-200 bg-white px-3 py-2">
          <span>🔍</span>
          <input value={searchId} onChange={(e) => setSearchId(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") void load(searchId.trim()); }}
            placeholder="Profile ID (ex: RED001)" aria-label="Profile ID search"
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
                  <TrustBadge trust={trust} completeness={Number(quality?.percent ?? 0)} />
                  {profile.phone_verified || profile.is_verified
                    ? <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">✅ Phone verified</span>
                    : <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-slate-600">⏳ Verify pending</span>}
                  {profile.id_verified ? <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-0.5 font-extrabold text-blue-800" title={te ? "Admin ప్రభుత్వ ID ని manual గా పరిశీలించారు" : "Government ID manually reviewed by admin"}>🪪 ID VERIFIED</span> : null}
                  {profile.selfie_verified ? <span className="rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">🤳 Selfie Verified</span> : null}
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

            {voiceUrl ? (
              <div className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 p-2">
                <span className="text-[12px] font-bold">🎙️</span>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={voiceUrl} className="h-8 flex-1" />
              </div>
            ) : null}

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-slate-700 sm:grid-cols-3">
              {[
                ["🎂 వయస్సు", `${profile.age ?? "—"}y`],
                ["📏 ఎత్తు", profile.height || "—"],
                ["🕉️ కులం", `${profile.caste || "—"}${profile.sub_caste ? ` (${profile.sub_caste})` : ""}`],
                ["🎓 చదువు", `${profile.education || "—"}${profile.education_detail ? ` ${profile.education_detail}` : ""}`],
                ["💼 ఉద్యోగం", `${profile.job || "—"}${profile.company ? ` @ ${profile.company}` : ""}`],
                ["💰 ఆదాయం", profile.salary || "—"],
                ["📍 ప్రాంతం", `${profile.district || "—"}, ${profile.state || "—"}`],
                ["⭐ నక్షత్రం", `${profile.star || "—"} / ${profile.rasi || "—"}`],
                ["💍 Marital", profile.marital_status || "—"],
                ["👶 Children • పిల్లలు", profile.children && profile.children !== "None" ? profile.children : "None • లేరు"],
                ["🕉️ గోత్రం", profile.gothram || "—"],
                ["👨‍👩‍👧 కుటుంబం", `${profile.family_type || "—"} · ${profile.family_status || "—"}`],
                ["🧿 దోషం", profile.dosham || "No"],
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

            {Array.isArray(data.reasons) && data.reasons.length ? (
              <div className="mt-3 rounded-2xl bg-emerald-50 p-3">
                <p className="text-[12px] font-bold text-emerald-900">{te ? "💡 ఎందుకు match అవుతారు?" : "💡 Why you match?"}</p>
                <ul className="mt-1 space-y-0.5 text-[12px] text-emerald-900">
                  {data.reasons.slice(0, 4).map((r: string, i: number) => <li key={i}>✔️ {r}</li>)}
                </ul>
              </div>
            ) : null}
          </section>

          {/* 💯 COMPATIBILITY — enduku ee score? (gothram/surname/age verdicts) */}
          {compat ? (
            <section className="mt-4 rounded-3xl border border-gold/30 bg-white p-5">
              <h2 className="text-lg font-extrabold text-[#7A0C2E]">
                💯 Compatibility — {compat.score}/100 ({compat.grade_telugu || compat.grade})
              </h2>
              <p className="mt-1 text-[13px] text-slate-700">{compat.verdict_telugu}</p>
              {compat.mutual?.both_like ? (
                <p className="mt-2 rounded-2xl border border-rose-300 bg-rose-50 p-2 text-[12px] font-bold text-rose-800">
                  {compat.mutual.note} ({te ? "వాళ్ల side" : "their side"}: {compat.mutual.their_score}/100)
                </p>
              ) : null}
              <div className="mt-3 space-y-1.5">
                {(compat.breakdown || []).filter((b: Row) => b.key !== "mutual").map((b: Row) => (
                  <div key={b.key} className="text-[12px]">
                    <div className="flex justify-between">
                      <span className="font-bold">{b.telugu || b.label}</span>
                      <span className="text-slate-500">{b.points}/{b.max}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-[#7A0C2E]" style={{ width: `${Math.round((b.ratio || 0) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1.5 text-[12px]">
                {[compat.gothram, compat.surname, compat.age_rule].filter(Boolean).map((v: Row, i: number) => (
                  <p key={i} className={`rounded-xl border p-2 ${v.blocked ? "border-red-300 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50/60 text-emerald-900"}`}>
                    {v.verdict_telugu}
                  </p>
                ))}
              </div>
              {chart ? (
                <div className="mt-3">
                  <RasiChart houses={chart.houses} moonHouse={chart.moon_house} star={chart.star} rasi={chart.rasi} note={chart.note_telugu} title={te ? "🗺️ వీళ్ల రాశి చార్ట్" : "🗺️ Their rasi chart"} />
                </div>
              ) : null}
            </section>
          ) : myTsapId && myTsapId !== searchId ? (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 text-center text-[12px] text-slate-500">
              💯 Compatibility score — profile data tho auto-calculate
            </p>
          ) : null}

          {/* 🔒 NUMBER LOCK — policy: credit tho numbers ivvamu */}
          <section className="mt-4 rounded-3xl border-2 border-rose-300 bg-rose-50 p-5">
            <h2 className="text-lg font-extrabold text-[#7A0C2E]">🔒 Phone number — {data.phone_masked || "•••••"} (locked)</h2>
            <p className="mt-1 text-[13px] text-rose-900">
              {data.can_view_number_reason || (te ? "Free లో numbers ఇవ్వము — interest accept (consent) తోనే exchange అవుతాయి." : "No numbers in free — exchange only on interest accept (consent).")}
            </p>
            <ol className="mt-3 space-y-1 text-[13px] text-rose-900">
              {(data.unlock_telugu || (te ? CONSENT_STEPS_TE : CONSENT_STEPS_EN)).map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ol>
            {unlocked ? (
              <div className="mt-4 rounded-2xl bg-emerald-600 p-4 text-center text-white">
                <p className="text-[12px] opacity-90">{te ? "✅ Unlock అయ్యింది — గౌరవంగా మాట్లాడండి 🙏" : "✅ Unlocked — talk respectfully 🙏"}</p>
                <p className="mt-1 text-2xl font-extrabold tracking-wider">{unlocked}</p>
                <div className="mt-2 flex justify-center gap-2">
                  <a href={`tel:${unlocked}`} className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-emerald-700">📞 Call</a>
                  <a href={`https://wa.me/91${unlocked}`} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-900 px-4 py-2 text-sm font-bold text-white">💬 WhatsApp</a>
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
                  {unlocking ? "Unlocking…" : "📞 Number Unlock (1 credit)"}
                </button>
                <a href={SITE_CONFIG.unlockBot(profile.tsap_id)} target="_blank" rel="noreferrer"
                  title={te ? "Telegram లో ఓపెన్ అవుతుంది — 1 క్రెడిట్‌తో number వస్తుంది" : "Opens on Telegram — number for 1 credit"}
                  className="rounded-xl gold-gradient px-4 py-2.5 text-sm font-bold text-maroon">
                  📞 {te ? "పూర్తి వివరాలు + నంబర్" : "Full details + Number"}
                </a>
                </>
              )}
              <Link href="/pricing" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700">
                💳 Paid plans (₹99 → 5 profiles)
              </Link>
            </div>
          </section>

          {/* actions */}
          <section className="mt-4 flex flex-wrap gap-2">
            <button onClick={printBiodata} className="rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 px-4 py-2 text-sm font-bold text-[#7A0C2E] transition shadow-xs">
              📄 {te ? "బయోడేటా డౌన్‌లోడ్ (Print)" : "Download Biodata (Print)"}
            </button>
            <button onClick={() => void toggleSave()}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${savedNow ? "bg-rose-100 text-rose-700" : "border border-slate-300 text-slate-700"}`}>
              {savedNow ? (te ? "❤️ Shortlist లో ఉంది" : "❤️ In shortlist") : "🤍 Shortlist"}
            </button>
            <button onClick={shareWhatsApp} className="rounded-xl bg-green-600 hover:bg-green-700 px-4 py-2 text-sm font-bold text-white transition">
              💬 WhatsApp Share
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

          {/* trust breakdown */}
          {trust ? (
            <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-800">🛡️ Trust score {trust.score}/100 — {trust.badge_telugu}</h2>
              <ul className="mt-2 space-y-1 text-[12px] text-slate-600">
                {(trust.factors || []).map((f: Row, i: number) => (
                  <li key={i}>{(f.points as number) > 0 ? "✅" : "•"} {f.telugu} <span className="text-slate-400">({f.points}/{f.max})</span></li>
                ))}
              </ul>
            </section>
          ) : null}

          {Object.keys(quality?.sections || {}).length ? (
            <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-bold text-slate-800">📝 Profile completeness {quality?.percent}%</h2>
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
            🔐 {data.consent_note_telugu || (te ? "Numbers consent తోనే exchange అవుతాయి — ఇది ఎప్పుడూ safe గా ఉంటుంది" : "Numbers exchange with consent only — always kept safe")}
          </p>
        </>
      ) : null}
    </main>
  );
}
