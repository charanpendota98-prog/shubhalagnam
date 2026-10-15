"use client";
/** Owner-only profile list; no compatibility score or preference-count ranking is shown. */
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiDisplayMessage, apiGet } from "@/lib/api";
import { firstName } from "@/lib/names";
import { useLang } from "@/lib/lang";

type Row = Record<string, any>;

export default function TopPicks() {
  const { lang } = useLang();
  const te = lang === "te";
  const [myId, setMyId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let id = "";
    try { id = localStorage.getItem("tsap_id") || ""; } catch { /* ignore */ }
    if (!id) { setLoaded(true); return; }
    setMyId(id);
    void apiGet<Row>(`/api/top-matches/${encodeURIComponent(id)}?limit=8`).then(({ ok, data }) => {
      setLoaded(true);
      if (ok && data) setRows(data.results || []);
    });
  }, []);

  if (!loaded) return null;
  if (!myId) {
    return (
      <div className="mb-4 rounded-2xl border border-gold/30 bg-white p-4 text-[13px]">
        <p className="font-bold text-maroon">⭐ {te ? "పరిశీలించడానికి profiles" : "Profiles to review"}</p>
        <p className="mt-1 text-gray-600">
          {te ? "Login చేస్తే approved profiles చూడవచ్చు. Compatibility score లెక్కించము; సభ్యులు ఇచ్చిన వివరాలను స్వతంత్రంగా పరిశీలించండి." : "Sign in to view approved profiles. No compatibility score is calculated; review member-provided details independently."}{" "}
          <Link href="/login" className="font-bold text-maroon underline">{te ? "Login" : "Login"}</Link>
        </p>
      </div>
    );
  }
  if (!rows.length) return null;
  return (
    <div className="mb-4 rounded-2xl border border-gold/30 bg-gradient-to-b from-amber-50 to-white p-4">
      <div className="flex items-center gap-2">
        <p className="text-[14px] font-bold text-maroon">⭐ {te ? "పరిశీలించడానికి profiles" : "Profiles to review"}</p>
      </div>
      <p className="mt-1 text-[11px] text-slate-600">{te ? "ఇది compatibility నిర్ణయం కాదు. Profile వివరాలు సభ్యులు అందించినవి." : "This is not a compatibility verdict. Profile details are member-provided."}</p>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {rows.map((r: Row) => {
          const terms = [r.caste, r.district]
            .map((term) => te ? String(term || "") : apiDisplayMessage({ message_en: term }, false, ""))
            .filter(Boolean);
          return (
          <Link key={r.tsap_id} href={`/search/${r.tsap_id}`}
            className="w-[190px] shrink-0 rounded-2xl border border-gold/25 bg-white p-3">
            <div className="flex min-h-5 items-center gap-2">
              {r.boosted ? <span className="text-[11px]" title={te ? "ప్రమోట్ చేసిన ప్రొఫైల్" : "Promoted profile"}>📣</span> : null}
              {r.has_voice ? <span className="text-[11px]" title={te ? "వాయిస్ పరిచయం ఉంది" : "Voice introduction available"}>🎙️</span> : null}
              {r.is_nri ? <span className="text-[11px]" title={te ? "సభ్యుడు తెలిపిన విదేశీ స్థానం" : "Listed overseas location"}>✈️</span> : null}
            </div>
            <p className="mt-1 truncate text-[13px] font-bold">{firstName(r.full_name) === "—" ? r.tsap_id : firstName(r.full_name)}{r.age ? ` • ${r.age}y` : ""}</p>
            <p className="truncate text-[11px] text-gray-600">{terms.join(" • ")}</p>
            <p className="font-mono text-[10px] text-gray-400">{r.tsap_id}</p>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
