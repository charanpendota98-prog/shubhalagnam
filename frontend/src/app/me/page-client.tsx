"use client";
/**
 * 🙋 MANA VIVAHA — MY ACCOUNT & PROFILE DASHBOARD
 * =====================================================
 * • 100% Profile Completion & In-Place Profile Editor
 * • Streak + Unlocks + Boost + Voice + Jathakam + Share + Alerts
 * • Real-time DB sync and instant match ranking upgrade
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AuthGate from "@/components/AuthGate";
import RasiChart from "@/components/RasiChart";
import PushBell from "@/components/PushBell";
import PayBox from "@/components/PayBox";
import MatchAssistant from "@/components/MatchAssistant";
import { apiDisplayMessage, apiGet, apiPost, authHeaders, readApiJson} from "@/lib/api";
// 🛡️ P0 security fix: /api/profile/{id} (GET+update) and /api/user/delete-account
// now require the owner's X-Tsap-Token server-side (was a zero-auth IDOR that
// leaked raw phone/password_hash/auth_token and allowed anyone to edit/delete
// any profile by guessing a tsap_id). authHeaders() attaches that token.
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import {
  CASTES,
  CASTES_DETAILED,
  CASTE_SUBCASTES,
  CASTE_TELUGU,
  OTHER_COMMUNITY_OPTION,
  EDUCATIONS,
  HEIGHTS,
  JOBS,
  BRIDE_PREFERRED_JOBS,
  GROOM_PREFERRED_JOBS,
  NAKSHATRAS,
  RASIS,
  SALARIES,
  TS_DISTRICTS,
  AP_DISTRICTS,
  OTHER_LOCATIONS,
  DISTRICTS_BY_STATE,
  DISTRICT_TELUGU,
  WORK_TYPES,
  heightLabel,
  sortUniqueOptions,
} from "@/lib/telugu-data";

type Row = Record<string, any>;
type Tab = "preferences" | "edit" | "streak" | "unlocks" | "boost" | "voice" | "jathakam" | "share" | "alerts";

const TABS: [Tab, string, string][] = [
  ["preferences", "🎯 Partner Preferences", "🎯 కోరుకునే సంబంధం (ప్రిఫరెన్సెస్)"],
  ["edit", "✏️ Edit Profile", "✏️ నా ప్రొఫైల్ సవరణ (100%)"],
  ["streak", "🔥 Streak", "🔥 స్ట్రీక్"],
  ["unlocks", "📋 Unlocks", "📋 అన్‌లాక్‌లు"],
  ["boost", "⚡ Boost", "⚡ బూస్ట్"],
  ["voice", "🎙️ Voice", "🎙️ వాయిస్"],
  ["jathakam", "🪐 Jathakam", "🪐 జాతకం"],
  ["share", "📤 Share", "📤 షేర్"],
  ["alerts", "🔔 Alerts", "🔔 అలర్ట్స్"],
];

export default function MePage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [myId, setMyId] = useState("");
  const [tab, setTab] = useState<Tab>("preferences");

  // Account Deletion & Marriage Fixed State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteReason, setDeleteReason] = useState<string>("married_via_manavivaha");
  const [partnerName, setPartnerName] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [deleteFeedback, setDeleteFeedback] = useState("");
  const [confirmDeleteCheck, setConfirmDeleteCheck] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteSuccessResult, setDeleteSuccessResult] = useState<{
    congratulations: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("tsap_id") || localStorage.getItem("tsap_last_id") || "";
      setMyId(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const handleDeleteAccount = async () => {
    if (!myId || !confirmDeleteCheck) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          tsap_id: myId,
          reason: deleteReason,
          partner_name: partnerName,
          partner_id: partnerId,
          feedback: deleteFeedback,
        }),
      });
      const data = await readApiJson(res);
      if (res.ok && data.success) {
        setDeleteSuccessResult({
          congratulations: !!data.congratulations,
          message: apiDisplayMessage(data, te, te ? "మీ ప్రొఫైల్ నిలిపివేయబడింది." : "Your profile has been hidden."),
        });
        localStorage.removeItem("tsap_id");
        localStorage.removeItem("tsap_token");
        localStorage.removeItem("tsap_last_id");
      } else {
        alert(apiDisplayMessage(data, te, te ? "ప్రొఫైల్‌ను దాచలేకపోయాం. మళ్లీ ప్రయత్నించండి." : "The profile could not be hidden. Please try again."));
      }
    } catch {
      alert(te ? "నెట్‌వర్క్ సమస్య ఏర్పడింది. దయచేసి మళ్లీ ప్రయత్నించండి." : "A network error occurred. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center justify-between border-b border-gold/30 pb-3">
        <div>
          <h1 className="text-2xl font-black text-[#7A0C2E]">
            <Duo en="🙋 My Account & Partner Preferences" te="🙋 నా ప్రొఫైల్ & కోరుకునే సంబంధం" />
          </h1>
          {myId && <p className="font-mono text-xs font-bold text-slate-500 mt-0.5">ID: {myId}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3 py-1.5 rounded-full border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold transition flex items-center gap-1 shadow-xs"
            title={te ? "వివాహం కుదిరింది / ప్రొఫైల్‌ను పబ్లిక్ శోధన నుంచి దాచండి" : "Mark as married or hide the profile from public search"}
          >
            <span>💍</span>
            <span>{te ? "వివాహం కుదిరింది / ప్రొఫైల్‌ను దాచు" : "Hide profile"}</span>
          </button>
          <Link href="/referral" className="px-3.5 py-1.5 rounded-full gold-gradient text-maroon text-xs font-black shadow-xs hover:brightness-105 transition">
            {te ? "🤝 రెఫరల్ & ₹50 రివార్డ్" : "🤝 Referrals & ₹50 reward"}
          </Link>
        </div>
      </div>

      {myId ? (
        <>
          {/* 🧠 Smart Match Assistant — daily personalized briefing (top of dashboard) */}
          <div className="mt-4">
            <MatchAssistant />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {TABS.map(([v, en, t]) => (
              <button
                key={v}
                onClick={() => setTab(v)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition ${
                  tab === v ? "maroon-gradient text-white shadow-sm" : "border border-slate-200 bg-white text-slate-700 hover:bg-amber-50"
                }`}
              >
                {te ? t : en}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {tab === "preferences" && <PartnerPreferencesPanel myId={myId} />}
            {tab === "edit" && <EditProfilePanel myId={myId} />}
            {tab === "streak" && <StreakPanel myId={myId} />}
            {tab === "unlocks" && <UnlocksPanel myId={myId} />}
            {tab === "boost" && <BoostPanel myId={myId} />}
            {tab === "voice" && <VoicePanel myId={myId} />}
            {tab === "jathakam" && <JathakamPanel myId={myId} />}
            {tab === "share" && <SharePanel />}
            {tab === "alerts" && <AlertsPanel />}
          </div>

          {/* Account Deletion Footer Trigger */}
          <div className="mt-12 pt-6 border-t border-slate-200 text-center space-y-2">
            <p className="text-xs text-slate-500 font-medium">
              {te ? "మీకు వివాహం నిశ్చయమైందా లేదా ప్రొఫైల్‌ను పబ్లిక్ శోధన నుంచి దాచాలనుకుంటున్నారా?" : "Are you getting married, or would you like to hide your profile from public search?"}
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition inline-flex items-center gap-1.5"
            >
              <span>{te ? "💍 వివాహం నిశ్చయమైంది" : "💍 I am getting married"}</span>
              <span>•</span>
              <span>{te ? "👁️ ప్రొఫైల్‌ను పబ్లిక్ శోధన నుంచి దాచండి" : "👁️ Hide profile from public search"}</span>
            </button>
          </div>
        </>
      ) : (
        <div className="mt-6">
          <AuthGate note={te ? "మీ ప్రొఫైల్ వివరాలు ఎడిట్ చేసుకోవడానికి లేదా చూడటానికి లాగిన్ అవ్వండి." : "Please login to view or edit your profile."} />
        </div>
      )}

      {/* 💍 ACCOUNT DELETION & MARRIAGE FIXED MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border-2 border-gold/40 space-y-4 animate-in fade-in zoom-in duration-200 my-8">
            {deleteSuccessResult ? (
              <div className="text-center py-6 space-y-4">
                <div className="text-5xl animate-bounce">
                  {deleteSuccessResult.congratulations ? "💐 🎉" : "✅"}
                </div>
                <h3 className="text-xl font-black text-[#7A0C2E]">
                  {deleteSuccessResult.congratulations ? (te ? "హృదయపూర్వక శుభాకాంక్షలు!" : "Congratulations on your wedding!") : (te ? "ప్రొఫైల్ పబ్లిక్ శోధన నుంచి దాచబడింది" : "Profile hidden from public search")}
                </h3>
                <p className="text-xs text-slate-700 leading-relaxed max-w-md mx-auto">
                  {deleteSuccessResult.message}
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-block px-6 py-2.5 rounded-2xl maroon-gradient text-white font-extrabold text-xs shadow-md hover:brightness-110 transition"
                  >
                    {te ? "హోమ్‌పేజీకి వెళ్లండి" : "Go home"}
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💍</span>
                    <div>
                      <h3 className="font-black text-navy text-base">{te ? "ప్రొఫైల్ దృశ్యమానత / వివాహ స్థితి" : "Profile visibility / marriage status"}</h3>
                      <p className="text-xs text-slate-500 font-mono">ID: {myId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    {te ? "ప్రొఫైల్‌ను పబ్లిక్ శోధన నుంచి దాచడానికి కారణాన్ని ఎంచుకోండి:" : "Choose why you want to hide your profile from public search:"}
                  </label>

                  <div className="space-y-2 text-xs">
                    {[
                      {
                        id: "married_via_manavivaha",
                        label: "🎉 మన వివాహ (Mana Vivaha) ద్వారా సంబంధం కుదిరింది!",
                        labelEn: "🎉 I found my match through Mana Vivaha",
                        desc: "మాకు వివాహం నిశ్చయమైంది • శుభాకాంక్షలు & సంతోషం",
                        descEn: "We are getting married • Best wishes and happiness",
                        badge: "Success Story",
                      },
                      {
                        id: "married_elsewhere",
                        label: "🤝 బయట ఇతర మార్గాల్లో వివాహం కుదిరింది",
                        labelEn: "🤝 I found a match elsewhere",
                        desc: "కుటుంబ సభ్యులు లేదా ఇతర మార్గాల ద్వారా సంబంధం ఖాయమైంది",
                        descEn: "The match was arranged by family or another source",
                      },
                      {
                        id: "pausing_search",
                        label: "⏸️ ప్రస్తుతానికి సంబంధాల అన్వేషణ తాత్కాలికంగా ఆపాము",
                        labelEn: "⏸️ I am pausing my search for now",
                        desc: "తరువాత ఎప్పుడైనా మళ్లీ వెతుకుతాము",
                        descEn: "I may resume my search later",
                      },
                      {
                        id: "privacy_other",
                        label: "🔒 వ్యక్తిగత గోప్యత లేదా ఇతర కారణాలు",
                        labelEn: "🔒 Privacy or another reason",
                        desc: "ప్రస్తుతం ప్రొఫైల్ తొలగించాలనుకుంటున్నాం",
                        descEn: "I want to hide my profile for now",
                      },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        className={`block p-3 rounded-2xl border cursor-pointer transition ${
                          deleteReason === opt.id
                            ? "bg-amber-50/70 border-maroon/60 ring-1 ring-maroon/30 shadow-xs"
                            : "border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="radio"
                            name="deleteReason"
                            value={opt.id}
                            checked={deleteReason === opt.id}
                            onChange={(e) => setDeleteReason(e.target.value)}
                            className="mt-0.5 accent-[#7A0C2E]"
                          />
                          <div className="space-y-0.5 flex-1">
                            <div className="font-bold text-slate-900 flex items-center justify-between">
                              <span>{te ? opt.label : opt.labelEn}</span>
                              {opt.badge && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{te ? opt.desc : opt.descEn}</p>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* If married via Mana Vivaha: Congratulations & Partner details */}
                {deleteReason === "married_via_manavivaha" && (
                  <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 space-y-2 text-xs">
                    <div className="font-black text-emerald-900 flex items-center gap-1.5">
                      <span>💐</span>
                      <span>{te ? "మన వివాహ కుటుంబం తరఫున హృదయపూర్వక శుభాకాంక్షలు!" : "Warm congratulations from the Mana Vivaha community!"}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">{te ? "భాగస్వామి పేరు (ఐచ్ఛికం)" : "Partner name (optional)"}:</label>
                        <input
                          type="text"
                          value={partnerName}
                          onChange={(e) => setPartnerName(e.target.value)}
                          placeholder={te ? "భాగస్వామి పేరు" : "Partner name"}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">{te ? "భాగస్వామి ప్రొఫైల్ ID (ఐచ్ఛికం)" : "Partner profile ID (optional)"}:</label>
                        <input
                          type="text"
                          value={partnerId}
                          onChange={(e) => setPartnerId(e.target.value)}
                          placeholder="Profile ID"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-medium focus:border-emerald-600 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback notes */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {te ? "మీ అనుభవం లేదా అభిప్రాయం (ఐచ్ఛికం):" : "Your feedback or review (optional):"}
                  </label>
                  <textarea
                    rows={2}
                    value={deleteFeedback}
                    onChange={(e) => setDeleteFeedback(e.target.value)}
                    placeholder={te ? "మన వివాహ సేవలు మీకు ఎలా అనిపించాయి? ఇతర వధూవరులకు సందేశం ఇవ్వండి…" : "How was your experience with Mana Vivaha? Share a note with other members…"}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:border-maroon focus:outline-none"
                  />
                </div>

                <p className="text-xs leading-relaxed text-slate-600">
                  {te ? "ఈ చర్య profile ను public search నుంచి దాచుతుంది; stored/payment/audit/archive records erase కావు. Accepted requests లో ముందే ఇచ్చిన contact access revoke కాదు; బయట copies మిగలవచ్చు. Erasure request కోసం " : "This hides the profile from public search; stored, payment, audit, and archive records are not erased. Contact access already granted through accepted requests is not revoked, and external copies may remain. For an erasure request, see "}
                  <Link href="/privacy" className="font-bold text-maroon underline">{te ? "Privacy & grievance contact" : "Privacy & grievance contact"}</Link>.
                </p>

                {/* Confirmation Checkbox */}
                <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200 text-xs text-rose-950 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="confirmDelete"
                    checked={confirmDeleteCheck}
                    onChange={(e) => setConfirmDeleteCheck(e.target.checked)}
                    className="mt-0.5 accent-rose-700 cursor-pointer"
                  />
                  <label htmlFor="confirmDelete" className="cursor-pointer font-medium leading-relaxed">
                    {te ? "నా ప్రొఫైల్‌ను పబ్లిక్ శోధన నుంచి దాచడానికి అంగీకరిస్తున్నాను. ఇది నిల్వ చేసిన రికార్డులను తొలగించదు లేదా అంగీకరించిన అభ్యర్థనల ద్వారా ఇప్పటికే ఇచ్చిన సంప్రదింపు ప్రాప్యతను రద్దు చేయదు." : "I agree to hide my profile from public search. This does not erase stored records or revoke contact access already granted through accepted requests."}
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 rounded-2xl border border-slate-300 font-bold text-xs text-slate-600 hover:bg-slate-100 transition"
                  >
                    {te ? "ప్రొఫైల్ అలాగే ఉంచండి" : "Keep profile"}
                  </button>
                  <button
                    type="button"
                    disabled={!confirmDeleteCheck || deleting}
                    onClick={handleDeleteAccount}
                    className="flex-1 py-2.5 rounded-2xl bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50"
                  >
                    {deleting ? (te ? "ప్రొఫైల్ దాచబడుతోంది…" : "Hiding profile…") : te ? "👁️ ప్రొఫైల్‌ను పబ్లిక్ శోధన నుంచి దాచండి" : "👁️ Hide profile from public search"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Msg({ m }: { m: { ok: boolean; text: string } | null }) {
  if (!m) return null;
  return (
    <p
      className={`mt-3 rounded-2xl border p-3 text-xs sm:text-sm font-semibold ${
        m.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900"
      }`}
    >
      {m.text}
    </p>
  );
}

/* ---------------- 🎯 PARTNER PREFERENCES (కోరుకునే సంబంధం) ---------------- */
function PartnerPreferencesPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Preference State
  const [ageMin, setAgeMin] = useState(21);
  const [ageMax, setAgeMax] = useState(30);
  const [heightMin, setHeightMin] = useState("5'0\"");
  const [heightMax, setHeightMax] = useState("5'10\"");
  const [castes, setCastes] = useState<string[]>([]);
  const [subCastes, setSubCastes] = useState<string[]>([]);
  const [casteNoBar, setCasteNoBar] = useState(false);
  const [educations, setEducations] = useState<string[]>([]);
  const [jobs, setJobs] = useState<string[]>([]);
  const [minSalary, setMinSalary] = useState("Any");
  const [districts, setDistricts] = useState<string[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<string[]>(["Never Married"]);
  const [diet, setDiet] = useState("Any");
  const [notes, setNotes] = useState("");

  // Filters & Counts
  const [casteSearch, setCasteSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [matchingCount, setMatchingCount] = useState<number>(0);
  const [previewMatches, setPreviewMatches] = useState<any[]>([]);
  const [myProfile, setMyProfile] = useState<Row | null>(null);

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    const { ok, data } = await apiGet<Row>(`/api/profile/preferences?tsap_id=${encodeURIComponent(myId)}`);
    if (ok && data?.preferences) {
      const p = data.preferences;
      setAgeMin(p.age_min || 21);
      setAgeMax(p.age_max || 30);
      setHeightMin(p.height_min || "5'0\"");
      setHeightMax(p.height_max || "5'10\"");
      setCastes(p.castes || []);
      setSubCastes(p.sub_castes || []);
      setCasteNoBar(Boolean(p.caste_no_bar));
      setEducations(p.educations || []);
      setJobs(p.jobs || []);
      setMinSalary(p.min_salary || "Any");
      setDistricts(p.districts || []);
      setMaritalStatuses(p.marital_statuses || ["Never Married"]);
      setDiet(p.diet || "Any");
      setNotes(p.notes || "");
      setMatchingCount(data.matching_count || 0);
      setPreviewMatches(data.preview_matches || []);
    }
    const profRes = await apiGet<Row>(`/api/profile/${encodeURIComponent(myId)}`);
    if (profRes.ok && profRes.data?.profile) {
      setMyProfile(profRes.data.profile);
    }
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const isGroom = myProfile?.gender === "Groom" || myProfile?.gender === "Male" || myProfile?.gender === "అబ్బాయి";
  const displayJobs = isGroom ? BRIDE_PREFERRED_JOBS : GROOM_PREFERRED_JOBS;

  const toggleCaste = (c: string) => {
    setCastes((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c]
    );
  };

  const toggleSubCaste = (s: string) => {
    setSubCastes((prev) =>
      prev.includes(s) ? prev.filter((item) => item !== s) : [...prev, s]
    );
  };

  const toggleEducation = (e: string) => {
    setEducations((prev) =>
      prev.includes(e) ? prev.filter((item) => item !== e) : [...prev, e]
    );
  };

  const toggleJob = (j: string) => {
    setJobs((prev) =>
      prev.includes(j) ? prev.filter((item) => item !== j) : [...prev, j]
    );
  };

  const toggleDistrict = (d: string) => {
    setDistricts((prev) =>
      prev.includes(d) ? prev.filter((item) => item !== d) : [...prev, d]
    );
  };

  const toggleMarital = (m: string) => {
    setMaritalStatuses((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  // Dynamically aggregated subcastes based on selected castes
  const availableSubCastes = sortUniqueOptions(
    castes.flatMap((c) => CASTE_SUBCASTES[c] || [])
  );

  const filteredCastes = CASTES_DETAILED.filter((c) => {
    if (!casteSearch.trim()) return true;
    const q = casteSearch.toLowerCase();
    return c.en.toLowerCase().includes(q) || c.te.includes(q);
  });

  const allDistricts = sortUniqueOptions([
    ...TS_DISTRICTS,
    ...AP_DISTRICTS,
    ...OTHER_LOCATIONS.map((location) => location.en),
    "USA / NRI",
    "Other",
  ]);

  const filteredDistricts = allDistricts.filter((d) => {
    if (!districtSearch.trim()) return true;
    const q = districtSearch.toLowerCase();
    const teName = DISTRICT_TELUGU[d] || "";
    return d.toLowerCase().includes(q) || teName.includes(q);
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const payload = {
      tsap_id: myId,
      age_min: ageMin,
      age_max: ageMax,
      height_min: heightMin,
      height_max: heightMax,
      castes,
      sub_castes: subCastes,
      caste_no_bar: casteNoBar,
      educations,
      jobs,
      min_salary: minSalary,
      districts,
      marital_statuses: maritalStatuses,
      diet,
      notes,
    };

    const { ok, data } = await apiPost<Row>("/api/profile/preferences", payload);
    setSaving(false);
    if (ok && data?.success) {
      setMsg({ ok: true, text: apiDisplayMessage(data, te, te ? "మీ ప్రాధాన్యతలు భద్రపరచబడ్డాయి. ✅" : "Your preferences have been saved.") });
      setMatchingCount(data.matching_count || 0);
      setPreviewMatches(data.preview_matches || []);
    } else {
      setMsg({ ok: false, text: te ? "ప్రిఫరెన్సెస్ సేవ్ చేయడంలో లోపం జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి." : "Could not save preferences. Please try again." });
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-gold/30 bg-white p-8 text-center text-sm font-bold text-slate-500">
        {te ? "మీ భాగస్వామి ప్రాధాన్యతలు లోడ్ అవుతున్నాయి…" : "Loading your partner preferences…"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner with Match Count */}
      <div className="rounded-3xl bg-gradient-to-r from-amber-500 via-rose-600 to-[#7A0C2E] p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              {te ? "🎯 స్మార్ట్ మ్యాచింగ్ ఫిల్టర్లు" : "🎯 Smart matching filters"}
            </span>
            <h2 className="text-xl sm:text-2xl font-black">
              {te ? "మీకు ఎలాంటి సంబంధం కావాలి?" : "What are you looking for in a match?"}
            </h2>
            <p className="text-xs sm:text-sm text-amber-100 mt-1 max-w-xl">
              {te ? "మీ వయస్సు, కమ్యూనిటీ, విద్య, వృత్తి మరియు ప్రాంత ప్రాధాన్యతలను సేవ్ చేసుకోండి. సరిపోలే ప్రొఫైల్‌లను శోధనలో చూడండి." : "Save your preferred age, community, education, occupation, and locations. Use them to filter member-submitted profiles."}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 min-w-[160px]">
            <span className="text-xs text-amber-200 block font-bold">{te ? "సరిపోలిన ప్రొఫైల్‌లు" : "Matching profiles"}</span>
            <span className="text-3xl font-black text-amber-300 block">{matchingCount}</span>
            <span className="text-[11px] text-white/90">{te ? "మీ ప్రాధాన్యతలకు సరిపోయేవి" : "Based on your preferences"}</span>
          </div>
        </div>

        {/* Quick View Matches Button */}
        {matchingCount > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap items-center justify-between gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {previewMatches.slice(0, 4).map((pm, idx) => (
                <div key={idx} className="w-8 h-8 rounded-full border-2 border-white bg-amber-100 flex items-center justify-center text-xs font-bold text-maroon overflow-hidden">
                  {pm.photo_url ? (
                    <Image src={pm.photo_url} alt="" width={32} height={32} unoptimized className="w-full h-full object-cover" />
                  ) : (
                    <span>{pm.gender === "Bride" ? "👰" : "🤵"}</span>
                  )}
                </div>
              ))}
            </div>
            <Link
              href="/matches"
              className="px-4 py-2 rounded-xl bg-white text-[#7A0C2E] font-black text-xs hover:bg-amber-100 transition shadow"
            >
              {te ? `👉 ${matchingCount} సరిపోలిన ప్రొఫైల్‌లను చూడండి` : `👉 View ${matchingCount} matching profiles`}
            </Link>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="rounded-3xl border border-gold/40 bg-white p-6 shadow-sm space-y-6">
        <Msg m={msg} />

        {/* ⚡ SMART 1-CLICK MATCH PRESETS (త్వరిత ఎంపికలు) */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border border-gold/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-maroon flex items-center gap-1.5 uppercase tracking-wide">
              <span>⚡</span> <span>{te ? "స్మార్ట్ 1-క్లిక్ ఎంపికలు" : "Quick preference presets"}</span>
            </span>
            <span className="text-[10px] text-slate-500 font-bold">{te ? "ఒక్క క్లిక్‌తో ప్రాధాన్యతలు సెట్ చేయండి" : "Set preferences in one click"}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {myProfile?.caste && (
              <button
                type="button"
                onClick={() => {
                  setCasteNoBar(false);
                  setCastes([myProfile.caste]);
                  setDistricts(["Hyderabad", "Ranga Reddy", "Medchal-Malkajgiri"]);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-amber-300 text-maroon shadow-xs hover:bg-amber-100 transition flex items-center gap-1"
              >
                <span>💍</span>
                <span>{te ? `నా కమ్యూనిటీ (${myProfile.caste}) + హైదరాబాద్` : `My community (${myProfile.caste}) + Hyderabad`}</span>
              </button>
            )}

            {/* Housewife / Homemaker Preset for Grooms */}
            {isGroom && (
              <button
                type="button"
                onClick={() => {
                  setJobs(["Housewife / Homemaker (గృహిణి)", "Not Working / Looking for Job"]);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-rose-300 text-rose-800 shadow-xs hover:bg-rose-50 transition flex items-center gap-1"
              >
                <span>🏡</span>
                <span>{te ? "గృహిణి ప్రొఫైల్‌లు మాత్రమే" : "Housewife / homemaker profiles"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEducations(["B.Tech / B.E.", "M.Tech / M.E.", "MS (USA / Abroad)", "MBA / PGDM"]);
                setJobs(["Software / IT Professional"]);
                setDistricts(["Hyderabad", "Ranga Reddy", "Medchal-Malkajgiri"]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-blue-300 text-blue-800 shadow-xs hover:bg-blue-50 transition flex items-center gap-1"
            >
              <span>💻</span>
              <span>{te ? "సాఫ్ట్‌వేర్ / IT నిపుణులు" : "Software / IT professionals"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setJobs(["Govt Employee / PSU", "Govt Employee (Central / State)", "Bank Officer / PO / Manager", "IAS / IPS / Civil Services / Group 1"]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-emerald-300 text-emerald-800 shadow-xs hover:bg-emerald-50 transition flex items-center gap-1"
            >
              <span>🏛️</span>
              <span>{te ? "ప్రభుత్వ ఉద్యోగులు" : "Government employees"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDistricts(["USA / NRI", "Other"]);
                setEducations(["MS (USA / Abroad)", "B.Tech / B.E.", "M.Tech / M.E."]);
                setJobs(["NRI / Working Abroad", "Software / IT Professional"]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-indigo-300 text-indigo-800 shadow-xs hover:bg-indigo-50 transition flex items-center gap-1"
            >
              <span>🌍</span>
              <span>{te ? "NRI సంబంధాలు (USA / విదేశాలు)" : "NRI matches (USA / abroad)"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setCasteNoBar(true);
                setCastes([]);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-purple-300 text-purple-800 shadow-xs hover:bg-purple-50 transition flex items-center gap-1"
            >
              <span>💖</span>
              <span>{te ? "కుల పరిమితి లేదు" : "Any community"}</span>
            </button>
          </div>
        </div>

        {/* 1. Age & Height Compatibility */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>🎂</span> <span>{te ? "వయస్సు & ఎత్తు పరిధి" : "Age and height range"}</span>
            </h3>
            <span className="text-xs font-bold text-[#7A0C2E] bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              {te ? `${ageMin} నుండి ${ageMax} సం. • ${heightMin} నుండి ${heightMax}` : `${ageMin}–${ageMax} years • ${heightMin}–${heightMax}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">{te ? "కనీస వయస్సు" : "Minimum age"}:</label>
              <select
                value={ageMin}
                onChange={(e) => setAgeMin(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                {[18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 35, 40].map((a) => (
                  <option key={a} value={a}>
                    {te ? `${a} సంవత్సరాలు` : `${a} years`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{te ? "గరిష్ట వయస్సు" : "Maximum age"}:</label>
              <select
                value={ageMax}
                onChange={(e) => setAgeMax(Number(e.target.value))}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                {[22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 34, 36, 38, 40, 45, 50, 55, 60].map((a) => (
                  <option key={a} value={a}>
                    {te ? `${a} సంవత్సరాలు` : `${a} years`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{te ? "కనీస ఎత్తు" : "Minimum height"}:</label>
              <select
                value={heightMin}
                onChange={(e) => setHeightMin(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                {HEIGHTS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{te ? "గరిష్ట ఎత్తు" : "Maximum height"}:</label>
              <select
                value={heightMax}
                onChange={(e) => setHeightMax(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                {HEIGHTS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 2. Castes Multi-Select */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>🏛️</span> <span>{te ? "కోరుకునే కమ్యూనిటీలు (అనేకం ఎంచుకోవచ్చు)" : "Preferred communities (select any)"}</span>
            </h3>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={casteNoBar}
                  onChange={(e) => {
                    setCasteNoBar(e.target.checked);
                    if (e.target.checked) setCastes([]);
                  }}
                  className="rounded accent-maroon"
                />
                <span>{te ? "అన్ని కమ్యూనిటీలు పర్వాలేదు" : "Any community"}</span>
              </label>

              {myProfile?.caste && (
                <button
                  type="button"
                  onClick={() => {
                    setCasteNoBar(false);
                    setCastes([myProfile.caste]);
                  }}
                  className="text-[11px] font-bold text-maroon underline hover:text-amber-800"
                >
                  {te ? `నా కమ్యూనిటీ (${myProfile.caste}) మాత్రమే` : `My community only (${myProfile.caste})`}
                </button>
              )}
            </div>
          </div>

          {!casteNoBar && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={casteSearch}
                  onChange={(e) => setCasteSearch(e.target.value)}
                  placeholder={te ? "🔍 సంఘం లేదా ఉపసంఘం పేరుతో వెతకండి" : "🔍 Search communities or sub-communities"}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-maroon"
                />
                {castes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCastes([])}
                    className="shrink-0 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    {te ? `క్లియర్ (${castes.length})` : `Clear (${castes.length})`}
                  </button>
                )}
              </div>

              {/* Caste Chips */}
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
                {filteredCastes.map((c) => {
                  const isSel = castes.includes(c.en);
                  return (
                    <button
                      type="button"
                      key={c.en}
                      onClick={() => toggleCaste(c.en)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isSel
                          ? "bg-[#7A0C2E] text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                      }`}
                    >
                      <span>{isSel ? "✓" : "+"}</span>
                      <span>{te ? c.display : c.en}</span>
                    </button>
                  );
                })}
              </div>

              {/* Selected Sub-castes if available */}
              {availableSubCastes.length > 0 && (
                <div className="pt-2 space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">
                    {te ? "ఉపకులాలు (ఐచ్ఛికం):" : "Sub-communities (optional):"}
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 border border-slate-100 rounded-2xl bg-amber-50/40">
                    {availableSubCastes.map((sub) => {
                      const isSubSel = subCastes.includes(sub);
                      return (
                        <button
                          type="button"
                          key={sub}
                          onClick={() => toggleSubCaste(sub)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${
                            isSubSel
                              ? "bg-amber-600 text-white shadow-xs"
                              : "bg-white border border-amber-200 text-slate-700 hover:bg-amber-100"
                          }`}
                        >
                          <span>{isSubSel ? "✓" : "+"}</span>
                          <span>{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Education Multi-Select */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>🎓</span> <span>{te ? "కోరుకునే విద్యార్హతలు" : "Preferred education"}</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setEducations([
                    "B.Tech / B.E.",
                    "M.Tech / M.E.",
                    "MS (USA / Abroad)",
                    "MBBS / MD / MS",
                    "MBA / PGDM",
                    "MCA",
                  ])
                }
                className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100"
              >
                {te ? "+ ప్రొఫెషనల్ / IT డిగ్రీలు" : "+ Professional and IT degrees"}
              </button>
              {educations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setEducations([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                >
                  {te ? `క్లియర్ (${educations.length})` : `Clear (${educations.length})`}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
            {[
              "B.Tech / B.E.",
              "M.Tech / M.E.",
              "MS (USA / Abroad)",
              "MBBS / MD / MS",
              "B.Pharm / M.Pharm",
              "MBA / PGDM",
              "MCA",
              "CA / CS / ICWA",
              "Degree (B.Sc / B.Com / B.A)",
              "Post Graduate (M.Sc / M.Com / M.A)",
              "Ph.D / Doctorate",
              "Polytechnic / Diploma",
              "Inter / 12th",
            ].map((e) => {
              const isSel = educations.includes(e);
              return (
                <button
                  type="button"
                  key={e}
                  onClick={() => toggleEducation(e)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isSel
                      ? "bg-[#7A0C2E] text-white shadow-xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                  }`}
                >
                  <span>{isSel ? "✓" : "+"}</span>
                  <span>{e}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Profession / Jobs Multi-Select */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>💼</span> <span>{te ? "కోరుకునే ఉద్యోగాలు / వృత్తులు" : "Preferred jobs and occupations"}</span>
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {isGroom ? (
                <>
                  <button
                    type="button"
                    onClick={() => setJobs(["Housewife / Homemaker (గృహిణి)", "Not Working / Looking for Job"])}
                    className="text-[11px] font-black text-rose-800 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 hover:bg-rose-100"
                  >
                    {te ? "🏡 గృహిణి మాత్రమే" : "🏡 Housewife / homemaker only"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setJobs([
                        "Software / IT Professional",
                        "Govt Employee / PSU / Bank",
                        "Doctor / Medical / Healthcare",
                        "Teacher / Lecturer / Professor",
                      ])
                    }
                    className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100"
                  >
                    {te ? "💼 ఉద్యోగం చేసే వధువులు" : "💼 Working brides"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setJobs([
                      "Software / IT Professional",
                      "Govt Employee / PSU (Central / State)",
                      "Doctor / Surgeon / Medical Specialist",
                      "Bank Officer / PO / Manager",
                      "Business Owner / Industrialist / Builder",
                    ])
                  }
                  className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hover:bg-amber-100"
                >
                  {te ? "+ ప్రముఖ వృత్తులు" : "+ Popular occupations"}
                </button>
              )}
              {jobs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setJobs([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                >
                  {te ? `క్లియర్ (${jobs.length})` : `Clear (${jobs.length})`}
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
            {displayJobs.map((j) => {
              const isSel = jobs.includes(j);
              const isHousewife = j.includes("Housewife") || j.includes("Homemaker") || j.includes("గృహిణి");
              return (
                <button
                  type="button"
                  key={j}
                  onClick={() => toggleJob(j)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                    isSel
                      ? isHousewife
                        ? "bg-rose-700 text-white shadow-xs"
                        : "bg-[#7A0C2E] text-white shadow-xs"
                      : isHousewife
                      ? "bg-rose-50 border border-rose-300 text-rose-900 hover:bg-rose-100"
                      : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                  }`}
                >
                  <span>{isSel ? "✓" : "+"}</span>
                  <span>{!te && j === "Housewife / Homemaker (గృహిణి)" ? "Housewife / homemaker" : j}</span>
                </button>
              );
            })}
          </div>

          {/* Minimum Income Bracket */}
          <div className="pt-2">
            <label className="font-bold text-slate-800 block text-xs mb-1">
              {te ? "కనీస వార్షిక ఆదాయం" : "Minimum annual income"}:
            </label>
            <select
              value={minSalary}
              onChange={(e) => setMinSalary(e.target.value)}
              className="w-full sm:w-72 p-2.5 border border-slate-200 rounded-xl bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-maroon"
            >
              <option value="Any">{te ? "ఏదైనా ఆదాయం" : "Any salary"}</option>
              <option value="₹3 - 5 Lakhs / year">{te ? "₹3–5 లక్షలు / సంవత్సరం" : "₹3–5 lakh / year"}</option>
              <option value="₹5 - 7 Lakhs / year">{te ? "₹5–7 లక్షలు / సంవత్సరం" : "₹5–7 lakh / year"}</option>
              <option value="₹7 - 10 Lakhs / year">{te ? "₹7–10 లక్షలు / సంవత్సరం" : "₹7–10 lakh / year"}</option>
              <option value="₹10 - 15 Lakhs / year">{te ? "₹10–15 లక్షలు / సంవత్సరం" : "₹10–15 lakh / year"}</option>
              <option value="₹15 - 25 Lakhs / year">{te ? "₹15–25 లక్షలు / సంవత్సరం" : "₹15–25 lakh / year"}</option>
              <option value="₹25 - 50 Lakhs / year">{te ? "₹25–50 లక్షలు / సంవత్సరం" : "₹25–50 lakh / year"}</option>
              <option value="₹50+ Lakhs (NRI / High Networth)">{te ? "₹50+ లక్షలు (NRI / అధిక ఆదాయం)" : "₹50+ lakh (NRI / high income)"}</option>
            </select>
          </div>
        </div>

        {/* 5. Districts Multi-Select */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2">
              <span>📍</span> <span>{te ? "కోరుకునే జిల్లాలు & ప్రాంతాలు" : "Preferred districts and locations"}</span>
            </h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setDistricts(["Hyderabad", "Ranga Reddy", "Medchal-Malkajgiri", "Sangareddy"])
                }
                className="text-[11px] font-bold text-slate-800 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 hover:bg-amber-100"
              >
                {te ? "హైదరాబాద్ మెట్రో" : "Hyderabad metro"}
              </button>
              <button
                type="button"
                onClick={() => setDistricts([...TS_DISTRICTS])}
                className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 hover:bg-indigo-100"
              >
                {te ? "తెలంగాణ అన్నీ" : "All Telangana"}
              </button>
              <button
                type="button"
                onClick={() => setDistricts([...AP_DISTRICTS])}
                className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100"
              >
                {te ? "ఆంధ్రప్రదేశ్ అన్నీ" : "All Andhra Pradesh"}
              </button>
              {districts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDistricts([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-800"
                >
                  {te ? `క్లియర్ (${districts.length})` : `Clear (${districts.length})`}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={districtSearch}
              onChange={(e) => setDistrictSearch(e.target.value)}
              placeholder={te ? "🔍 జిల్లాను వెతకండి (ఉదా: Hyderabad, Warangal, Guntur)…" : "🔍 Search districts (e.g. Hyderabad, Warangal, Guntur)…"}
              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-maroon"
            />

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 border border-slate-100 rounded-2xl bg-slate-50/50">
              {filteredDistricts.map((d) => {
                const isSel = districts.includes(d);
                const teName = DISTRICT_TELUGU[d] || "";
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => toggleDistrict(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isSel
                        ? "bg-[#7A0C2E] text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                    }`}
                  >
                    <span>{isSel ? "✓" : "+"}</span>
                    <span>{te ? `${d} ${teName ? `(${teName})` : ""}` : d}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 6. Marital Status & Diet */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span>💍</span> <span>{te ? "వైవాహిక స్థితి & ఇతర అలవాట్లు" : "Marital status and lifestyle"}</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1.5">{te ? "వైవాహిక స్థితి" : "Marital status"}:</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { v: "Never Married", l: te ? "మొదటి వివాహం" : "Never married" },
                  { v: "Divorced", l: te ? "విడాకులు" : "Divorced" },
                  { v: "Widowed", l: te ? "వితంతువు / విధురుడు" : "Widowed" },
                ].map((m) => {
                  const isSel = maritalStatuses.includes(m.v);
                  return (
                    <button
                      type="button"
                      key={m.v}
                      onClick={() => toggleMarital(m.v)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isSel
                          ? "bg-[#7A0C2E] text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:border-gold hover:bg-amber-50"
                      }`}
                    >
                      <span>{isSel ? "✓" : "+"}</span>
                      <span>{m.l}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-800 block mb-1.5">{te ? "ఆహారపు అలవాటు" : "Diet"}:</label>
              <select
                value={diet}
                onChange={(e) => setDiet(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white font-bold text-slate-800 focus:outline-none focus:border-maroon"
              >
                <option value="Any">{te ? "ఏదైనా" : "Any diet"}</option>
                <option value="Vegetarian">{te ? "శాఖాహారం మాత్రమే" : "Vegetarian"}</option>
                <option value="Non-Vegetarian">{te ? "మాంసాహారం" : "Non-vegetarian"}</option>
              </select>
            </div>
          </div>
        </div>

        {/* 7. Save Action Bar */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600 font-medium text-center sm:text-left">
            {te ? "💾 సేవ్ చేసిన తర్వాత మీ ప్రాధాన్యతలకు సరిపోయే ప్రొఫైల్‌ల సంఖ్య నవీకరించబడుతుంది." : "💾 Saving updates the count of profiles matching your preferences."}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl gold-gradient text-maroon text-sm font-black shadow-md hover:brightness-105 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (te ? "సేవ్ అవుతోంది…" : "Saving…") : te ? "💾 నా ప్రాధాన్యతలను సేవ్ చేయండి" : "💾 Save preferences"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ================= ✏️ PROFILE COMPLETION & EDIT PANEL ================= */
function EditProfilePanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const T = (telugu: string, english: string) => (te ? telugu : english);
  const [profile, setProfile] = useState<Row>({});
  const [score, setScore] = useState<number>(65);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const selectedCaste = String(profile.caste || "");
  const isListedCaste = CASTES.some((caste) =>
    caste !== OTHER_COMMUNITY_OPTION && caste.toLocaleLowerCase("en") === selectedCaste.toLocaleLowerCase("en")
  );
  const casteSelectValue = isListedCaste ? selectedCaste : OTHER_COMMUNITY_OPTION;
  const customCasteValue = casteSelectValue === OTHER_COMMUNITY_OPTION
    ? String(profile.caste_custom || (selectedCaste !== OTHER_COMMUNITY_OPTION ? selectedCaste : ""))
    : "";
  const fieldLabels: Record<string, string> = {
    full_name: T("పూర్తి పేరు", "Full name"), gender: T("లింగం", "Gender"), dob: T("పుట్టిన తేదీ", "Date of birth"),
    height: T("ఎత్తు", "Height"), marital_status: T("వైవాహిక స్థితి", "Marital status"), caste: T("కమ్యూనిటీ", "Community"),
    sub_caste: T("ఉప-కమ్యూనిటీ", "Sub-community"), gothram: T("గోత్రం", "Gothram"), star: T("నక్షత్రం", "Nakshatram"),
    rasi: T("రాశి", "Rasi"), education: T("విద్య", "Education"), education_detail: T("విద్య వివరాలు", "Education details"),
    job: T("వృత్తి", "Occupation"), company: T("కంపెనీ", "Company"), salary: T("వార్షిక ఆదాయం", "Annual income"),
    work_type: T("పని రకం", "Work type"), work_location: T("పని ప్రదేశం", "Work location"), father_name: T("తండ్రి పేరు", "Father’s name"),
    father_occupation: T("తండ్రి వృత్తి", "Father’s occupation"), mother_name: T("తల్లి పేరు", "Mother’s name"),
    native_place: T("సొంత ఊరు", "Native place"), state: T("రాష్ట్రం", "State"), district: T("జిల్లా", "District"),
    phone: T("ఫోన్ నంబర్", "Phone number"), about_myself: T("నా గురించి", "About me"), photo_url: T("ఫోటో", "Photo"),
  };

  /** Missing fields that have a control on this page can be focused directly. */
  const FOCUSABLE_FIELDS = new Set([
    "full_name", "dob", "height", "marital_status", "sub_caste", "gothram", "star", "rasi",
    "education", "job", "company", "salary", "work_location", "district", "father_name",
    "mother_name", "native_place", "expectations", "about_myself", "photo_url",
  ]);

  const nextSteps = missing
    .filter((field) => fieldLabels[field] || field)
    .slice(0, 6)
    .map((field) => ({
      field,
      label: fieldLabels[field] || String(field).replaceAll("_", " "),
      focusable: FOCUSABLE_FIELDS.has(field),
    }));

  const focusField = (field: string) => {
    const control = document.getElementById(`me-${field}`);
    if (!control) return;
    control.scrollIntoView({ behavior: "smooth", block: "center" });
    // preventScroll avoids fighting the smooth scroll we just started.
    (control as HTMLElement).focus({ preventScroll: true });
  };

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(myId)}`, { headers: authHeaders() });
      if (res.ok) {
        const d = await readApiJson(res);
        setProfile(d.profile || {});
        setScore(d.completeness_score || 70);
        setMissing(d.missing_fields || []);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [myId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const setField = (k: string, v: any) => {
    setProfile((prev) => ({ ...prev, [k]: v }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const profilePayload = { ...profile };
    if (String(profile.caste || "") === OTHER_COMMUNITY_OPTION) {
      const customCaste = String(profile.caste_custom || "").trim();
      if (!customCaste) {
        setMsg({ ok: false, text: T("కమ్యూనిటీ పేరును నమోదు చేయండి", "Enter your community name.") });
        setSaving(false);
        return;
      }
      profilePayload.caste = customCaste;
    }
    delete profilePayload.caste_custom;
    try {
      const res = await fetch("/api/profile/update", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tsap_id: myId, ...profilePayload }),
      });
      const d = await readApiJson(res);
      if (res.ok && d.success) {
        setScore(d.completeness_score || 100);
        setMissing(d.missing_fields || []);
        setMsg({ ok: true, text: apiDisplayMessage(d, te, te ? "ప్రొఫైల్ వివరాలు అప్‌డేట్ అయ్యాయి. ✅" : "Profile details updated.") });
      } else {
        setMsg({ ok: false, text: apiDisplayMessage(d, te, te ? "అప్‌డేట్ విఫలమైంది. మళ్లీ ప్రయత్నించండి." : "Update failed. Please try again.") });
      }
    } catch {
      setMsg({ ok: false, text: T("నెట్‌వర్క్ సమస్య — దయచేసి మళ్లీ ప్రయత్నించండి", "A network error occurred. Please try again.") });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-gold/30 space-y-2">
        <div className="w-8 h-8 border-4 border-maroon border-t-transparent rounded-full animate-spin mx-auto" />
        <div className="text-xs font-bold text-slate-600">{T("ప్రొఫైల్ వివరాలు లోడ్ అవుతున్నాయి…", "Loading profile details…")}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Completion Progress Card */}
      <div className="bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-gold/50 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h2 className="text-base font-black text-slate-900">
                {T("ప్రొఫైల్ పూర్తి స్థితి", "Profile completion")} <span className="text-maroon">{score}%</span>
              </h2>
            </div>
            <p className="text-xs text-slate-600 telugu mt-1">
              {T("వివరాలు పూర్తి చేస్తే కుటుంబాలకు మీ ప్రొఫైల్‌ను సమీక్షించడానికి మరింత సమాచారం ఉంటుంది. శోధన స్థానం లేదా స్పందనలకు హామీ లేదు.", "More complete details help families review your profile. Profile completeness does not guarantee search placement or responses.")}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-black ${
                score >= 90 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}
            >
              {score >= 90 ? T("🌟 ఎక్కువ వివరాలు జోడించారు", "🌟 Profile details added") : T("⚡ పూర్తి చేయాల్సినవి ఉన్నాయి", "⚡ More details to add")}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-500 bg-gradient-to-r from-[#D4AF37] via-[#A0143A] to-[#7A0C2E]"
            style={{ width: `${score}%` }}
          />
        </div>

        {nextSteps.length > 0 && (
          <div className="bg-white/80 rounded-xl p-3 border border-gold/20 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-maroon">
                💡 {T("తదుపరి చర్యలు", "Suggested next steps")}
              </p>
              <span className="text-[10px] font-bold text-slate-500">
                {T(`${nextSteps.length} మిగిలాయి`, `${nextSteps.length} remaining`)}
              </span>
            </div>
            <ul className="flex flex-wrap gap-1.5">
              {nextSteps.map((step) => (
                <li key={step.field}>
                  {step.focusable ? (
                    <button
                      type="button"
                      onClick={() => focusField(step.field)}
                      className="inline-flex min-h-11 items-center gap-1 rounded-full border border-gold/50 bg-amber-50 px-3 py-1.5 text-[11px] font-bold text-maroon transition hover:bg-amber-100"
                    >
                      <span aria-hidden="true">✏️</span>
                      <span>{step.label}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                      <span aria-hidden="true">ℹ️</span>
                      <span>{step.label}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-[10px] leading-relaxed text-slate-500">
              {T(
                "ఇవి ఐచ్ఛికం. నొక్కితే ఆ ఫీల్డ్ దగ్గరికి వెళ్తుంది; మీరు save చేసే వరకు ఏమీ మారదు, ఎవరితోనూ పంచుకోదు.",
                "These are optional. Tapping jumps to that field — nothing changes and nothing is shared until you save.",
              )}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Link href="/matches" className="inline-flex min-h-11 items-center rounded-full maroon-gradient px-4 py-2 text-xs font-bold text-white">
            {T("సంబంధాలను వెతకండి →", "Browse matches →")}
          </Link>
          <Link href="/shortlist" className="inline-flex min-h-11 items-center rounded-full border border-maroon/30 px-4 py-2 text-xs font-bold text-maroon">
            {T("❤️ నా షార్ట్‌లిస్ట్", "❤️ My shortlist")}
          </Link>
          <Link href="/safety" className="inline-flex min-h-11 items-center rounded-full border border-maroon/30 px-4 py-2 text-xs font-bold text-maroon">
            {T("భద్రతా మార్గదర్శిని", "Safety guide")}
          </Link>
        </div>
      </div>

      <Msg m={msg} />

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-5 sm:p-7 border border-gold/30 shadow-md space-y-6">
        {/* 1. Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>👤</span> <span>{T("ప్రాథమిక వివరాలు", "Basic information")}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("పూర్తి పేరు", "Full name")}:</label>
              <input id={`me-full_name`}
                type="text"
                value={profile.full_name || ""}
                onChange={(e) => setField("full_name", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("పుట్టిన తేదీ", "Date of birth")}:</label>
              <input id={`me-dob`}
                type="date"
                value={profile.dob ? String(profile.dob).slice(0, 10) : ""}
                onChange={(e) => setField("dob", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("ఎత్తు", "Height")}:</label>
              <select id={`me-height`}
                value={profile.height || ""}
                onChange={(e) => setField("height", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("ఎంచుకోండి", "Select…")}</option>
                {HEIGHTS.map((h) => (
                  <option key={h} value={h}>
                    {heightLabel(h)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{te ? "వైవాహిక స్థితి" : "Marital status"}:</label>
              <select id={`me-marital_status`}
                value={profile.marital_status || ""}
                onChange={(e) => setField("marital_status", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("ఎంచుకోండి / తెలియజేయలేదు", "Select / not specified")}</option>
                <option value="Pelli Kaledu">{T("పెళ్లి కాలేదు", "Never married")}</option>
                <option value="Divorced">{T("విడాకులు", "Divorced")}</option>
                <option value="Widow">{T("వితంతువు", "Widow")}</option>
                <option value="Widower">{T("భార్య మరణించారు", "Widower")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2. Caste & Horoscope */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>⭐</span> <span>{T("కులం & జ్యోతిషం", "Community and astrology")}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("కులం / కమ్యూనిటీ", "Community")}:</label>
              <select
                value={casteSelectValue}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === OTHER_COMMUNITY_OPTION) {
                    setField("caste", next);
                    setField("caste_custom", customCasteValue);
                  } else {
                    setField("caste", next);
                    setField("caste_custom", "");
                  }
                }}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("ఎంచుకోండి", "Select…")}</option>
                {CASTES.map((c) => (
                  <option key={c} value={c}>
                    {c === OTHER_COMMUNITY_OPTION ? c : te ? `${CASTE_TELUGU[c] || c} (${c})` : c}
                  </option>
                ))}
              </select>
              {casteSelectValue === OTHER_COMMUNITY_OPTION && (
                <input
                  type="text"
                  value={customCasteValue}
                  onChange={(e) => {
                    setField("caste", OTHER_COMMUNITY_OPTION);
                    setField("caste_custom", e.target.value.slice(0, 100));
                  }}
                  placeholder={T("కమ్యూనిటీ పేరు నమోదు చేయండి", "Enter your community name")}
                  maxLength={100}
                  className="mt-2 w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
                  aria-label="Self-described community name"
                />
              )}
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("ఉపకులం", "Sub-community")}:</label>
              <input id={`me-sub_caste`}
                type="text"
                value={profile.sub_caste || ""}
                onChange={(e) => setField("sub_caste", e.target.value)}
                placeholder={T("ఉపకులం", "Sub-community")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("గోత్రం", "Gothram")}:</label>
              <input id={`me-gothram`}
                type="text"
                value={profile.gothram || ""}
                onChange={(e) => setField("gothram", e.target.value)}
                placeholder={T("గోత్రం", "Gothram")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("నక్షత్రం", "Nakshatram")}:</label>
              <select id={`me-star`}
                value={profile.star || ""}
                onChange={(e) => setField("star", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("నక్షత్రం ఎంచుకోండి", "Select nakshatram")}</option>
                {NAKSHATRAS.map((st) => (
                  <option key={st.en} value={st.en}>
                    {te ? `⭐ ${st.te} (${st.en})` : `⭐ ${st.en}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("రాశి", "Rasi")}:</label>
              <select id={`me-rasi`}
                value={profile.rasi || ""}
                onChange={(e) => setField("rasi", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("రాశి ఎంచుకోండి", "Select rasi")}</option>
                {RASIS.map((r) => (
                  <option key={r.en} value={r.en}>
                    {te ? `${r.te} (${r.en})` : r.en}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("కుజ దోషం", "Manglik / dosham")}:</label>
              <select id={`me-dosham`}
                value={profile.dosham || ""}
                onChange={(e) => setField("dosham", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("ఎంచుకోండి / తెలియదు", "Select / unknown")}</option>
                <option value="No">{T("లేదు", "No dosham")}</option>
                <option value="Yes">{T("కుజ దోషం కలదు", "Manglik")}</option>
                <option value="Partial">{T("పాక్షిక దోషం", "Partial")}</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Education & Career */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>💼</span> <span>{T("చదువు & ఉద్యోగం", "Education and career")}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("విద్యార్హత", "Education")}:</label>
              <select id={`me-education`}
                value={profile.education || ""}
                onChange={(e) => setField("education", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("ఎంచుకోండి", "Select…")}</option>
                {EDUCATIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("ఉద్యోగం / హోదా", "Occupation / job title")}:</label>
              <input id={`me-job`}
                type="text"
                value={profile.job || ""}
                onChange={(e) => setField("job", e.target.value)}
                placeholder={T("ఉదా: సాఫ్ట్‌వేర్ ఇంజినీర్", "e.g. Software Engineer")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("కంపెనీ", "Company / employer")}:</label>
              <input id={`me-company`}
                type="text"
                value={profile.company || ""}
                onChange={(e) => setField("company", e.target.value)}
                placeholder={T("ఉదా: TCS, ప్రభుత్వం, వ్యాపారం", "e.g. TCS, government, business")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("వార్షిక వేతనం", "Annual salary")}:</label>
              <select id={`me-salary`}
                value={profile.salary || ""}
                onChange={(e) => setField("salary", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("ఎంచుకోండి", "Select…")}</option>
                {SALARIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("పని చేసే నగరం", "Work location")}:</label>
              <input id={`me-work_location`}
                type="text"
                value={profile.work_location || ""}
                onChange={(e) => setField("work_location", e.target.value)}
                placeholder={T("ఉదా: హైదరాబాద్", "e.g. Hyderabad")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("జిల్లా", "District")}:</label>
              <input id={`me-district`}
                type="text"
                value={profile.district || ""}
                onChange={(e) => setField("district", e.target.value)}
                placeholder={T("ఉదా: వరంగల్, గుంటూరు", "e.g. Warangal, Guntur")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
          </div>
        </div>

        {/* 4. Family & Physical Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-black text-maroon uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-2">
            <span>👨‍👩‍👧</span> <span>{T("కుటుంబ వివరాలు & శారీరక లక్షణాలు", "Family and physical details")}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("తండ్రి పేరు & వృత్తి", "Father’s name and occupation")}:</label>
              <input id={`me-father_name`}
                type="text"
                value={profile.father_name || ""}
                onChange={(e) => setField("father_name", e.target.value)}
                placeholder={T("తండ్రి పేరు", "Father’s name")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("తల్లి పేరు & వృత్తి", "Mother’s name and occupation")}:</label>
              <input id={`me-mother_name`}
                type="text"
                value={profile.mother_name || ""}
                onChange={(e) => setField("mother_name", e.target.value)}
                placeholder={T("తల్లి పేరు", "Mother’s name")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("సొంత ఊరు", "Native place")}:</label>
              <input id={`me-native_place`}
                type="text"
                value={profile.native_place || ""}
                onChange={(e) => setField("native_place", e.target.value)}
                placeholder={T("సొంత ఊరు", "Native place")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("అన్నదమ్ములు", "Brothers")}:</label>
              <input id={`me-brothers`}
                type="text"
                value={profile.brothers ?? ""}
                onChange={(e) => setField("brothers", e.target.value)}
                placeholder={T("ఉదా: 1 (వివాహితుడు)", "e.g. 1 (married)")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("అక్కచెల్లెళ్లు", "Sisters")}:</label>
              <input id={`me-sisters`}
                type="text"
                value={profile.sisters ?? ""}
                onChange={(e) => setField("sisters", e.target.value)}
                placeholder={T("ఉదా: 1", "e.g. 1")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("వర్ణం", "Complexion")}:</label>
              <select id={`me-complexion`}
                value={profile.complexion || ""}
                onChange={(e) => setField("complexion", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("ఎంచుకోండి / తెలియజేయలేదు", "Select / not specified")}</option>
                <option value="Very Fair">{T("చాలా తెల్లని", "Very fair")}</option>
                <option value="Fair">{T("తెల్లని", "Fair")}</option>
                <option value="Wheatish">{T("గోధుమ రంగు", "Wheatish")}</option>
                <option value="Dark">{T("ముదురు", "Dark")}</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("కుటుంబ రకం", "Family type")}:</label>
              <select id={`me-family_type`}
                value={profile.family_type || ""}
                onChange={(e) => setField("family_type", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("ఎంచుకోండి / తెలియజేయలేదు", "Select / not specified")}</option>
                <option value="Nuclear">{T("చిన్న కుటుంబం", "Nuclear family")}</option>
                <option value="Joint">{T("ఉమ్మడి కుటుంబం", "Joint family")}</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("కుటుంబ స్థాయి", "Family financial status")}:</label>
              <select id={`me-family_status`}
                value={profile.family_status || ""}
                onChange={(e) => setField("family_status", e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-maroon"
              >
                <option value="">{T("ఎంచుకోండి / తెలియజేయలేదు", "Select / not specified")}</option>
                <option value="Middle Class">{T("మధ్యతరగతి", "Middle class")}</option>
                <option value="Upper Middle Class">{T("ఎగువ మధ్యతరగతి", "Upper-middle class")}</option>
                <option value="Rich / Affluent">{T("శ్రీమంతులు / ఉన్నత వర్గం", "Affluent")}</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1">{T("మాతృభాష", "Mother tongue")}:</label>
              <input id={`me-mother_tongue`}
                type="text"
                value={profile.mother_tongue || ""}
                onChange={(e) => setField("mother_tongue", e.target.value)}
                placeholder={T("మీ మాతృభాష నమోదు చేయండి", "Enter your mother tongue")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="font-bold text-slate-800 block mb-1">{T("భాగస్వామి నుంచి కోరుకునేవి", "Partner expectations")}:</label>
              <textarea id={`me-expectations`}
                rows={2}
                value={profile.expectations || ""}
                onChange={(e) => setField("expectations", e.target.value)}
                placeholder={T("మీరు కోరుకునే భాగస్వామి విద్య, వృత్తి, వ్యక్తిత్వం మరియు అలవాట్ల గురించి రాయండి…", "Describe your preferred partner’s education, occupation, personality, and lifestyle…")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon telugu"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="font-bold text-slate-800 block mb-1">{T("ఫోటో లింక్", "Photo link")}:</label>
              <input id={`me-photo_url`}
                type="text"
                value={profile.photo_url || ""}
                onChange={(e) => setField("photo_url", e.target.value)}
                placeholder="https://..."
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="font-bold text-slate-800 block mb-1">{T("నా గురించి", "About me")}:</label>
              <textarea id={`me-about_myself`}
                rows={3}
                value={profile.about_myself || ""}
                onChange={(e) => setField("about_myself", e.target.value)}
                placeholder={T("మీ కుటుంబం, వ్యక్తిత్వం మరియు అంచనాల గురించి క్లుప్తంగా రాయండి…", "Briefly describe your family, personality, and expectations…")}
                className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-maroon telugu"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">{T("సేవ్ చేసిన తర్వాత మీ వివరాలు నవీకరించబడతాయి; శోధన స్థానం లేదా స్పందనలకు హామీ లేదు.", "Saving updates your details; it does not guarantee search placement or responses.")}</span>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-2xl gold-gradient text-maroon text-xs sm:text-sm font-black shadow-md hover:brightness-105 transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (te ? "సేవ్ అవుతోంది…" : "Saving…") : te ? "💾 మార్పులను సేవ్ చేయండి" : "💾 Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- 🔥 STREAK ---------------- */
function StreakPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [st, setSt] = useState<Row | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const { ok, data } = await apiGet<Row>(`/api/streak/${encodeURIComponent(myId)}`);
    if (ok && data) setSt(data);
  }, [myId]);
  useEffect(() => {
    void load();
  }, [load]);
  const claim = async () => {
    setBusy(true);
    const { ok, data, errorTelugu } = await apiPost<Row>("/api/streak/claim", { tsap_id: myId });
    setBusy(false);
    if (ok && data?.success) {
      setMsg({ ok: true, text: apiDisplayMessage(data, te, te ? "Claimed." : "Daily bonus claimed.") });
      void load();
    } else setMsg({ ok: false, text: apiDisplayMessage(data, te, errorTelugu || (te ? "మళ్లీ ప్రయత్నించండి." : "Please try again.")) });
  };
  return (
    <section className="rounded-3xl border border-rose-200 bg-white p-5 text-center">
      <p className="text-5xl">🔥</p>
      <p className="mt-2 text-4xl font-extrabold text-[#7A0C2E]">{st?.count ?? "—"}</p>
      <p className="text-[12px] text-slate-500">{te ? "రోజుల స్ట్రీక్" : "day streak"}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-3 text-[12px]">
        <span className="rounded-full bg-amber-50 border border-amber-300 px-3 py-1">🏆 {te ? "గరిష్ఠం" : "Best"}: {st?.best ?? "—"}</span>
        <span className="rounded-full bg-emerald-50 border border-emerald-300 px-3 py-1">🎁 {te ? "తదుపరి" : "Next"}: +{st?.next_bonus ?? "?"} {te ? "క్రెడిట్‌లు" : "credits"}</span>
      </div>
      <button
        onClick={() => void claim()}
        disabled={busy || !!st?.claimed_today}
        className="mt-4 rounded-2xl bg-[#7A0C2E] px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {st?.claimed_today ? (te ? "✅ ఈరోజు క్లెయిమ్ చేశారు" : "✅ Claimed today") : busy ? (te ? "లోడ్ అవుతోంది…" : "Working…") : te ? "🎁 రోజువారీ బోనస్ పొందండి" : "🎁 Claim daily bonus"}
      </button>
      <Msg m={msg} />
    </section>
  );
}

/* ---------------- 📋 UNLOCKS ---------------- */
function UnlocksPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [list, setList] = useState<Row[]>([]);
  useEffect(() => {
    apiGet<Row[]>(`/api/unlocks/${encodeURIComponent(myId)}`).then((r) => {
      if (r.ok && r.data) setList(r.data);
    });
  }, [myId]);
  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-5">
      <h2 className="text-base font-extrabold text-[#7A0C2E]">{te ? "మీరు అన్‌లాక్ చేసిన profiles" : "Your unlocked profiles"}</h2>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{te ? "ఇంకా ఏ profile ని unlock చేయలేదు." : "No unlocked profiles yet."}</p>
      ) : (
        <div className="mt-3 divide-y divide-slate-100">
          {list.map((u, i) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="font-bold text-slate-800">{u.target_id || u.tsap_id}</span>
              <span className="text-xs text-slate-500">{u.at || u.time || (te ? "ఇటీవల" : "Recently")}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- ⚡ BOOST ---------------- */
function BoostPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [packs, setPacks] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    apiGet<Row>("/api/boost/packs").then((result) => {
      const rows = Array.isArray(result.data) ? result.data : (result.data as any)?.packs;
      if (result.ok && Array.isArray(rows)) setPacks(rows);
      else setLoadError(true);
    }).catch(() => setLoadError(true)).finally(() => setLoading(false));
  }, []);

  return (
    <section className="min-w-0 space-y-4 rounded-3xl border border-gold/30 bg-white p-4 text-center sm:p-5">
      <div className="text-4xl" aria-hidden="true">⚡</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">{te ? "ప్రొఫైల్ ప్రమోషన్" : "Profile promotion"}</h2>
      <p className="mx-auto max-w-xl text-xs leading-relaxed text-slate-600">
        {te ? "ఎంచుకున్న కాలానికి బూస్ట్ కొనండి. చెల్లింపు ధృవీకరించిన తర్వాత మాత్రమే అమలవుతుంది." : "Choose a promotion duration. The boost is activated only after payment is verified."}
      </p>
      {loading ? <p className="text-sm text-slate-500" role="status">{te ? "ప్యాక్‌లను లోడ్ చేస్తున్నాం…" : "Loading packs…"}</p> : null}
      {loadError ? <p className="text-sm text-rose-700" role="alert">{te ? "ప్రస్తుతం ప్యాక్‌లు లోడ్ కాలేదు." : "Promotion packs could not be loaded."}</p> : null}
      {!loading && !loadError && packs.length === 0 ? <p className="text-sm text-slate-500">{te ? "ప్యాక్‌లు అందుబాటులో లేవు." : "No packs are currently available."}</p> : null}
      {packs.length > 0 && (
        <div className="grid min-w-0 grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
          {packs.map((pack) => (
            <div key={pack.code} className="min-w-0 space-y-3 rounded-2xl border border-gold/40 p-3 text-left">
              <div className="min-w-0">
                <div className="break-words text-sm font-bold text-maroon">{pack.label || pack.code}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{pack.days} {te ? "రోజులు" : "days"} · ₹{pack.price}</div>
              </div>
              <PayBox planCode={pack.code} price={Number(pack.price)} label={te ? "బూస్ట్ ప్యాక్" : "Boost pack"} purpose="boost" tsapId={myId} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- 🎙️ VOICE ---------------- */
function VoicePanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("tsap_id", myId);
    fd.append("file", file);
    try {
      const res = await fetch("/api/voice/upload", { method: "POST", body: fd });
      const d = await readApiJson(res);
      if (res.ok && d.success) setMsg({ ok: true, text: te ? "వాయిస్ బయోడేటా అప్‌లోడ్ అయింది! ✅" : "Voice bio uploaded successfully." });
      else setMsg({ ok: false, text: apiDisplayMessage(d, te, te ? "అప్‌లోడ్ విఫలమైంది. మళ్లీ ప్రయత్నించండి." : "Upload failed. Please try again.") });
    } catch {
      setMsg({ ok: false, text: te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "A network error occurred. Please try again." });
    }
    setUploading(false);
  };

  return (
    <section className="rounded-3xl border border-indigo-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">🎙️</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">{te ? "వాయిస్ బయోడేటా" : "Voice bio"}</h2>
      <p className="text-xs text-slate-600">{te ? "ఆడియో బయోడేటాను అప్‌లోడ్ చేసి మీ ప్రొఫైల్‌కు జోడించండి." : "Upload an audio bio to add it to your profile."}</p>
      <label className="mx-auto block max-w-full text-xs text-slate-700">
        <span className="sr-only">{te ? "ఆడియో ఫైల్‌ను ఎంచుకోండి" : "Choose an audio file"}</span>
        <input type="file" accept="audio/*" onChange={handleVoiceUpload} className="max-w-full text-xs pt-2" />
      </label>
      {uploading && <div className="text-xs text-slate-500" role="status">{te ? "అప్‌లోడ్ అవుతోంది…" : "Uploading…"}</div>}
      <Msg m={msg} />
    </section>
  );
}

/* ---------------- 🪐 JATHAKAM ---------------- */
function JathakamPanel({ myId }: { myId: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [dosha, setDosha] = useState<Row | null>(null);
  const [chart, setChart] = useState<Row | null>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    apiGet<Row>(`/api/astro/dosha/${encodeURIComponent(myId)}`).then((r) => {
      if (r.ok && r.data) setDosha(r.data);
    });
    apiGet<Row>(`/api/astro/chart/${encodeURIComponent(myId)}`).then((r) => {
      if (r.ok && r.data?.success) setChart(r.data);
    });
  }, [myId]);

  const handleJathakamUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("tsap_id", myId);
    fd.append("file", file);
    try {
      const res = await fetch("/api/astro/jathakam/upload", { method: "POST", body: fd });
      const d = await readApiJson(res);
      if (res.ok && d.success) setMsg({ ok: true, text: te ? "జాతక పత్రం అప్‌లోడ్ అయింది! ✅" : "Birth chart uploaded successfully." });
      else setMsg({ ok: false, text: apiDisplayMessage(d, te, te ? "అప్‌లోడ్ విఫలమైంది. మళ్లీ ప్రయత్నించండి." : "Upload failed. Please try again.") });
    } catch {
      setMsg({ ok: false, text: te ? "నెట్‌వర్క్ సమస్య. మళ్లీ ప్రయత్నించండి." : "A network error occurred. Please try again." });
    }
    setUploading(false);
  };

  return (
    <section className="rounded-3xl border border-amber-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">🪐</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">{te ? "వేద జాతకం & రాశి చక్రం" : "Vedic birth chart and rasi"}</h2>
      <RasiChart
        houses={chart?.houses}
        moonHouse={chart?.moon_house}
        star={chart?.star}
        rasi={chart?.rasi}
        title={te ? "నా చంద్ర రాశి చక్రం" : "My Moon-sign chart"}
        note={chart ? (te ? chart.note_telugu : chart.rasi_known
          ? "This Moon-sign chart uses the rasi in your profile. It does not infer an ascendant or planetary placements."
          : "Add your rasi in Edit Profile to highlight the Moon's house.") : undefined}
      />
      {dosha && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 text-left text-xs text-slate-700">
          <h3 className="font-bold text-slate-900">{te ? "జాతక స్క్రీనింగ్" : "Astrology screening"}</h3>
          <p className="mt-1">{te ? dosha.verdict_telugu || "జాతక స్క్రీనింగ్ సమాచారం." : dosha.level === "clear"
            ? "No dosha flags were returned by this basic screening."
            : `${Array.isArray(dosha.flags) ? dosha.flags.length : 0} item(s) were flagged for review. Please consult a qualified astrologer.`}</p>
          <p className="mt-1 text-slate-600">{te ? dosha.note_telugu : "This is an informational screening, not a compatibility decision. Have the full chart reviewed by a qualified astrologer."}</p>
        </div>
      )}
      <div className="pt-2">
        <label className="text-xs font-bold text-slate-700 block mb-1">{te ? "జాతక పత్రం అప్‌లోడ్" : "Upload a birth chart"}:</label>
        <input type="file" accept="image/*,application/pdf" onChange={handleJathakamUpload} className="mx-auto block max-w-full text-xs" />
        {uploading && <div className="mt-1 text-xs text-slate-500" role="status">{te ? "అప్‌లోడ్ అవుతోంది…" : "Uploading…"}</div>}
        <Msg m={msg} />
      </div>
      <div className="flex justify-center gap-2 pt-2">
        <Link href="/porutham" className="px-5 py-2.5 rounded-2xl maroon-gradient text-white font-bold text-xs shadow-md">
          {te ? "ఉచిత గుణమేళనం చూడండి" : "Check compatibility"}
        </Link>
      </div>
    </section>
  );
}

/* ---------------- 📤 SHARE ---------------- */
function SharePanel() {
  const { lang } = useLang();
  const te = lang === "te";

  return (
    <section className="rounded-3xl border border-emerald-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl">📤</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">{te ? "ప్రొఫైల్ షేరింగ్ & బయోడేటా" : "Profile sharing and biodata"}</h2>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={`/biodata`} className="px-5 py-2.5 rounded-2xl gold-gradient text-maroon font-bold text-xs shadow-md">
          {te ? "🎴 HD బయోడేటా JPG డౌన్‌లోడ్" : "🎴 Download high-resolution biodata JPG"}
        </Link>
        <Link href="/referral" className="px-5 py-2.5 rounded-2xl maroon-gradient text-white font-bold text-xs shadow-md">
          {te ? "🤝 రెఫరల్ QR కోడ్" : "🤝 Referral QR code"}
        </Link>
      </div>
    </section>
  );
}

/* ---------------- 🔔 ALERTS ---------------- */
function AlertsPanel() {
  const { lang } = useLang();
  const te = lang === "te";
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 text-center space-y-3">
      <div className="text-4xl" aria-hidden="true">🔔</div>
      <h2 className="text-base font-extrabold text-[#7A0C2E]">{te ? "మ్యాచ్ అలర్ట్స్" : "Match alerts"}</h2>
      <p className="mx-auto max-w-lg text-xs leading-relaxed text-slate-600">
        {te ? "ఈ ఖాతాలో మ్యాచ్ అలర్ట్‌లను ఇంకా సెటప్ చేయలేదు. కొత్త ప్రొఫైల్‌లను మ్యాచెస్ పేజీలో చూడండి." : "Match alerts are not configured for this account yet. Browse available profiles on the Matches page."}
      </p>
      <Link href="/matches" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-[#7A0C2E] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7A0C2E]">
        {te ? "మ్యాచెస్ చూడండి" : "Browse matches"}
      </Link>
    </section>
  );
}
