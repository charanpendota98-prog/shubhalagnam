"use client";

import { apiDisplayMessage, readApiJson } from "@/lib/api";
/**
 * 📄 WAVE 15 — CMS custom page (/p/{slug}) — admin creates, site renders.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useLang } from "@/lib/lang";

type Page = { slug: string; title_en: string; title_te: string; body_en: string; body_te: string;
  photos: string[]; tags: string[]; updated_at: string };

export default function CmsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const { slug } = useParams() as { slug: string };
  const [p, setP] = useState<Page | null>(null);
  const [missing, setMissing] = useState(false);
  const [all, setAll] = useState<Page[]>([]);
  useEffect(() => {
    fetch(`/api/cms/pages/${encodeURIComponent(slug)}`).then((r) => readApiJson(r)).then((d) => {
      if (d?.success) setP(d.page);
      else setMissing(true);
    }).catch(() => setMissing(true));
    fetch("/api/cms/pages").then((r) => readApiJson(r)).then((d) => {
      if (d?.success) setAll((d.pages || []).filter((x: Page) => x.slug !== slug));
    }).catch(() => {});
  }, [slug]);
  const paras = (t: string) => (t || "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const englishTitle = apiDisplayMessage({ message_en: p?.title_en }, false, "");
  const englishBody = apiDisplayMessage({ message_en: p?.body_en }, false, "");
  const localizedTitle = te ? (p?.title_te || p?.title_en || "") : englishTitle;
  const localizedBody = te ? (p?.body_te || "") : englishBody;
  const relatedPages = all.filter((item) => Boolean(te
    ? (item.title_te || item.title_en)
    : apiDisplayMessage({ message_en: item.title_en }, false, "")));
  const displayTitle = localizedTitle || (te ? "సమాచార పేజీ" : "Information Page");
  const displayTags = te
    ? p?.tags || []
    : (p?.tags || []).map((tag) => apiDisplayMessage({ message_en: tag }, false, "")).filter(Boolean);

  useEffect(() => {
    if (!p) return;
    const brand = te ? "మన వివాహ (Mana Vivaha)" : "Mana Vivaha (మన వివాహ)";
    document.title = `${displayTitle} | ${brand}`;
    const descriptionText = localizedBody.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
    let meta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    const description = descriptionText || (te ? "మన వివాహ సమాచారం పేజీ." : "Information published by Mana Vivaha.");
    meta.content = description;
    const setMeta = (attribute: "name" | "property", key: string, content: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    };
    setMeta("property", "og:title", document.title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:locale", te ? "te_IN" : "en_IN");
    setMeta("name", "twitter:title", document.title);
    setMeta("name", "twitter:description", description);
  }, [displayTitle, localizedBody, p, te]);
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="text-xs font-bold text-[#7A0C2E]">← {te ? "హోమ్" : "Home"}</Link>
      {missing && <p className="mt-6 text-center text-gray-500">{te ? "⚠️ Page దొరకలేదు — admin publish చెయ్యలేదు." : "⚠️ Page not found — admin hasn\u2019t published it."}</p>}
      {p && (
        <>
          <h1 className={`mt-3 text-3xl font-extrabold text-[#7A0C2E] ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>{displayTitle}</h1>
          {displayTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {displayTags.map((tag) => <span key={tag} className="text-[11px] bg-rose-50 text-rose-700 rounded-full px-2 py-0.5">#{tag}</span>)}
            </div>
          )}
          {(p.photos || []).length > 0 && (
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              {p.photos.map((url) => <Image key={url} src={url} alt={localizedTitle} width={640} height={480} unoptimized className="w-full rounded-2xl object-cover" loading="lazy" />)}
            </div>
          )}
          {localizedBody ? (
            <div className={`mt-4 space-y-2 text-[15px] text-gray-800 leading-relaxed ${te ? "telugu" : ""}`} lang={te ? "te-IN" : "en-IN"}>
              {paras(localizedBody).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {te ? "ఈ పేజీకి తెలుగు కంటెంట్ ఇంకా అందుబాటులో లేదు." : "An English version of this page is not available yet."}
            </p>
          )}
        </>
      )}
      {relatedPages.length > 0 && (
        <div className="mt-8 rounded-2xl border p-4">
          <div className="font-bold text-sm text-[#7A0C2E]">{te ? "📄 మరిన్ని పేజీలు" : "📄 More pages"}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {relatedPages.map((x) => (
              <Link key={x.slug} href={`/p/${x.slug}`} className="chip !py-1.5 !text-xs" lang={te ? "te-IN" : "en-IN"}>{te ? (x.title_te || x.title_en) : apiDisplayMessage({ message_en: x.title_en }, false, "Information Page")}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
