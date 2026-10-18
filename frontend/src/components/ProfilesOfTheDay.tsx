"use client";


import { apiDisplayMessage, readApiJson } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { duo } from "@/lib/duo";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { Button, EmptyState } from "@/components/ui";
import { CardSkeletonList } from "@/components/Skeletons";

export type SpotlightProfile = {
  promo_id: string;
  tsap_id: string;
  full_name?: string;
  gender?: string;
  age?: number | string | null;
  caste?: string;
  subcaste?: string;
  district?: string;
  education?: string;
  job?: string;
  income?: string;
  height?: string;
  marital_status?: string;
  badge_text?: string;
  badge_text_te?: string;
  headline?: string;
  pitch_text?: string;
  photo_url?: string;
  video_url?: string;
  media_type?: string;
  views_count?: number;
};

function getVideoSource(raw?: string) {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (!["youtu.be", "youtube.com", "m.youtube.com", "youtube-nocookie.com"].includes(host)) return null;
    const id = host === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts)\/([\w-]{11})/)?.[1];
    return id && /^[\w-]{11}$/.test(id)
      ? { kind: "embed" as const, src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1` }
      : null;
  } catch {
    return null;
  }
}

export default function ProfilesOfTheDay() {
  const { lang } = useLang();
  const te = lang === "te";
  const [profiles, setProfiles] = useState<SpotlightProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{ kind: "embed" | "video"; src: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/spotlight/active?limit=6", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Spotlight request failed");
        return readApiJson(response);
      })
      .then((data) => {
        const items = Array.isArray(data?.items) ? data.items : [];
        setProfiles(items.filter((item: any) => item?.promo_id && item?.tsap_id));
        setLoadError(false);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") setLoadError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!activeVideo) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveVideo(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeVideo]);

  const trackClick = (promoId: string) => {
    fetch(`/api/spotlight/track/${encodeURIComponent(promoId)}?kind=click`, { method: "POST" }).catch(() => {});
  };

  // Keep the homepage focused when no approved placement is active. The full
  // spotlight route remains available from navigation for profile promotion.
  if (!loading && (loadError || profiles.length === 0)) return null;

  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-4 py-10" aria-label={te ? "ప్రమోట్ చేసిన ప్రొఫైళ్లు" : "Sponsored profile spotlights"}>
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-1/2 h-[350px] w-[min(600px,100vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-100/60 via-rose-100/50 to-gold-soft/40 blur-3xl" />
      </div>

      <Reveal>
        <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow={duo("⭐ Sponsored profiles", "⭐ ప్రమోట్ చేసిన ప్రొఫైళ్లు")}
            title={duo("Sponsored profile placements", "స్పాన్సర్డ్ ప్రొఫైల్ ప్రమోషన్లు")}
            subtitle={duo(
              "Sponsored profiles appear after payment and media review. Profile details are member-submitted and are not independently verified.",
              "చెల్లింపు, మీడియా సమీక్ష తర్వాత ప్రమోట్ చేసిన ప్రొఫైళ్లు కనిపిస్తాయి. వివరాలు సభ్యులు అందించినవి; స్వతంత్రంగా నిర్ధారించినవి కావు."
            )}
            telugu
          />
          <Link href="/spotlight" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#B8860B]/40 gold-gradient px-5 py-2.5 text-center text-xs font-black text-[#5c0821] shadow-gold transition hover:brightness-105 active:scale-[.98] sm:w-auto sm:shrink-0 sm:text-sm">
            <span>{te ? "మీ ప్రొఫైల్ ప్రమోట్ చేయండి" : "Promote your profile"}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Reveal>

      {loading ? (
        <CardSkeletonList n={3} />
      ) : loadError ? (
        <EmptyState
          icon="⚠️"
          title={te ? "స్పాట్‌లైట్ ప్రొఫైళ్లు లోడ్ కాలేదు" : "Spotlight profiles did not load"}
          description={te ? "ప్రస్తుతం ఈ విభాగం అందుబాటులో లేదు. కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి." : "This section is unavailable right now. Please try again in a moment."}
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              {te ? "మళ్లీ ప్రయత్నించండి" : "Retry"}
            </Button>
          }
        />
      ) : profiles.length === 0 ? (
        <EmptyState
          icon="💍"
          title={te ? "ఆమోదించిన స్పాట్‌లైట్ ప్రొఫైళ్లు లేవు" : "No approved spotlight profiles right now"}
          description={te ? "సభ్యులు సమర్పించిన వివరాలను స్పాట్‌లైట్ సమీక్ష స్వతంత్రంగా నిర్ధారించదు." : "Spotlight review does not independently verify member-submitted details."}
        />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile, index) => {
            const name = profile.full_name?.trim() || profile.tsap_id;
            const video = getVideoSource(profile.video_url);
            const englishText = (value: unknown) => apiDisplayMessage({ message_en: value }, false, "");
            const attributes = [profile.caste, profile.subcaste, profile.district].filter(Boolean);
            const displayAttributes = te ? attributes : attributes.map(englishText).filter(Boolean);
            const displayBadge = te
              ? (profile.badge_text_te || "స్పాన్సర్డ్ ప్రొఫైల్")
              : englishText(profile.badge_text) || "Sponsored profile";
            const displayHeadline = te ? profile.headline : englishText(profile.headline);
            const displayPitch = te ? profile.pitch_text : englishText(profile.pitch_text);
            const displayEducation = te ? profile.education : englishText(profile.education);
            const displayJob = te ? profile.job : englishText(profile.job);
            const displayDistrict = te ? profile.district : englishText(profile.district);
            const displayHeight = te ? profile.height : englishText(profile.height);
            const age = Number(profile.age);
            return (
              <Reveal key={profile.promo_id} delay={Math.min(index * 60, 240)}>
                <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-amber-200/80 bg-white shadow-lg transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative h-60 bg-gradient-to-br from-rose-100 via-amber-50 to-slate-100 sm:h-64">
                    {profile.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={profile.photo_url} alt={te ? `${name} ప్రొఫైల్ ఫోటో` : `${name} profile photo`} className="h-full w-full object-cover object-top" loading="lazy" />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-maroon" aria-label={te ? "ఫోటో అందుబాటులో లేదు" : "Photo not provided"}>
                        <span className="text-5xl" aria-hidden="true">💍</span>
                        <span className="text-xs font-semibold">{te ? "ఫోటో ఇవ్వలేదు" : "Photo not provided"}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" aria-hidden="true" />
                    <div className="absolute left-3 right-3 top-3 flex min-w-0 items-start justify-between gap-2">
                      <span className="max-w-[75%] break-words rounded-full border border-white/40 bg-amber-300 px-3 py-1 text-[10px] font-black uppercase leading-relaxed text-maroon shadow">
                        {displayBadge}
                      </span>
                      <span className="max-w-[45%] break-all rounded-full border border-white/20 bg-black/60 px-2.5 py-1 font-mono text-[10px] font-bold text-white">{profile.tsap_id}</span>
                    </div>
                    {video && (
                      <button type="button" onClick={() => setActiveVideo(video)} className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-maroon/90 text-xl text-white shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label={te ? "ప్రొఫైల్ వీడియో ప్లే చేయండి" : "Play profile video"}>
                        ▶
                      </button>
                    )}
                    <div className="absolute bottom-3 left-3 right-3 min-w-0 text-white">
                      <h3 className="break-words text-lg font-extrabold drop-shadow sm:text-xl">{name}</h3>
                      <p className="mt-1 break-words text-xs font-medium text-amber-100">
                        {Number.isFinite(age) && age > 0 ? `${age} ${te ? "సం." : "yrs"}` : null}
                        {displayHeight ? ` · ${displayHeight}` : null}
                        {displayAttributes.length ? ` · ${displayAttributes.join(" · ")}` : null}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                    <div className="min-w-0 space-y-2">
                      {displayHeadline && <h4 className="break-words rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-bold leading-relaxed text-maroon">{displayHeadline}</h4>}
                      {displayPitch && <p className="break-words rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">{displayPitch}</p>}
                      <dl className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        {(displayEducation || displayJob) && (
                          <div className="min-w-0 rounded-xl border border-slate-100 p-2.5">
                            <dt className="text-[10px] text-slate-500">{te ? "విద్య / ఉద్యోగం" : "Education / work"}</dt>
                            <dd className="break-words font-semibold text-slate-800">{[displayEducation, displayJob].filter(Boolean).join(" · ")}</dd>
                          </div>
                        )}
                        {displayDistrict && (
                          <div className="min-w-0 rounded-xl border border-slate-100 p-2.5">
                            <dt className="text-[10px] text-slate-500">{te ? "ప్రాంతం" : "Location"}</dt>
                            <dd className="break-words font-semibold text-slate-800">{displayDistrict}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="mt-auto border-t border-slate-100 pt-3">
                      <Link href={`/search/${encodeURIComponent(profile.tsap_id)}`} onClick={() => trackClick(profile.promo_id)} className="flex min-h-11 w-full items-center justify-center rounded-xl bg-maroon px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon">
                        {te ? "పూర్తి ప్రొఫైల్ చూడండి" : "View full profile"}
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}

      {activeVideo && (
        <div role="dialog" aria-modal="true" aria-label={te ? "ప్రొఫైల్ వీడియో" : "Profile video"} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5" onClick={() => setActiveVideo(null)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-amber-300 bg-slate-950 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
              <h2 className="text-sm font-bold">{te ? "ప్రొఫైల్ వీడియో" : "Profile video"}</h2>
              <button type="button" onClick={() => setActiveVideo(null)} className="min-h-10 min-w-10 rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20" aria-label={te ? "వీడియో మూసివేయండి" : "Close video"}>×</button>
            </div>
            <div className="aspect-video w-full bg-black">
              {activeVideo.kind === "embed" ? (
                <iframe src={activeVideo.src} title={te ? "స్పాట్‌లైట్ ప్రొఫైల్ వీడియో" : "Spotlight profile video"} className="h-full w-full border-0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
              ) : (
                <video src={activeVideo.src} controls autoPlay playsInline className="h-full w-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
