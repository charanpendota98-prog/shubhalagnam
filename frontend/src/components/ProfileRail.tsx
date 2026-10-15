"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { apiDisplayMessage, apiGet } from "@/lib/api";
import { useLang } from "@/lib/lang";

type Profile = {
  tsap_id: string; full_name?: string; age?: number; caste?: string; district?: string;
  job?: string; photo_url?: string; id_verified?: boolean; viewed_at?: string;
};
type Response = { profiles?: Profile[] };

export default function ProfileRail({ kind, profileId }: { kind: "recent" | "similar"; profileId?: string }) {
  const { lang } = useLang();
  const te = lang === "te";
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const viewerId = (() => { try { return localStorage.getItem("tsap_id") || ""; } catch { return ""; } })();
    const id = kind === "similar" ? profileId : viewerId;
    if (!id) { setLoading(false); return; }
    const path = kind === "similar"
      ? `/api/profiles/${encodeURIComponent(id)}/similar?limit=8`
      : `/api/recently-viewed/${encodeURIComponent(id)}?limit=12`;
    void apiGet<Response>(path).then((res) => {
      if (active && res.ok) setProfiles(res.data?.profiles || []);
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [kind, profileId]);

  if (!loading && profiles.length === 0) return null;
  const title = kind === "recent"
    ? (te ? "ఇటీవల చూసిన ప్రొఫైళ్లు" : "Recently viewed")
    : (te ? "మరిన్ని ప్రొఫైళ్లు" : "More profiles");
  const subtitle = kind === "recent"
    ? (te ? "మీరు ఆపిన చోటు నుంచే మళ్లీ కొనసాగించండి" : "Continue where you left off")
    : (te ? "కొత్తగా ఆమోదించిన ప్రొఫైళ్లు; similarity ranking లేదు" : "Recently added approved profiles; not ranked for similarity");

  return (
    <section className="my-6" aria-labelledby={`${kind}-profiles-title`}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id={`${kind}-profiles-title`} className="text-lg font-extrabold text-maroon">{kind === "recent" ? "🕘" : "✨"} {title}</h2>
          <p className="text-[11px] text-slate-500">{subtitle}</p>
        </div>
        <Link href="/matches" className="shrink-0 text-xs font-bold text-maroon">{te ? "అన్నీ చూడండి →" : "See all →"}</Link>
      </div>
      <div className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {loading
          ? [0, 1, 2, 3].map((x) => <div key={x} className="h-48 w-36 shrink-0 animate-pulse rounded-2xl bg-slate-200" />)
          : profiles.map((p) => {
            const caste = te ? p.caste : apiDisplayMessage({ message_en: p.caste }, false, "");
            const district = te ? p.district : apiDisplayMessage({ message_en: p.district }, false, "");
            return (
            <Link href={`/search/${encodeURIComponent(p.tsap_id)}`} key={p.tsap_id}
              className="group w-36 shrink-0 snap-start overflow-hidden rounded-2xl border border-gold/30 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-brand">
              <div className="relative h-24 bg-gradient-to-br from-rose-100 to-amber-50">
                {p.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : <div className="grid h-full place-items-center text-4xl" aria-hidden="true">{p.full_name ? "👤" : "💍"}</div>}
                {p.id_verified ? <span title={te ? "ప్రభుత్వ ID సమీక్ష నమోదు; ఇతర profile వివరాలు నిర్ధారించబడవు" : "Government ID review recorded; other profile details are not verified"} className="absolute left-2 top-2 rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-extrabold text-white shadow">🪪 {te ? "ID సమీక్ష" : "ID reviewed"}</span> : null}
              </div>
              <div className="p-2.5">
                <p className="truncate text-[12px] font-extrabold text-ink">{p.full_name || p.tsap_id}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-600">{[p.age ? `${p.age}y` : "", caste].filter(Boolean).join(" • ")}</p>
                {district ? <p className="truncate text-[10px] text-slate-500">📍 {district}</p> : null}
              </div>
            </Link>
            );
          })}
      </div>
    </section>
  );
}
