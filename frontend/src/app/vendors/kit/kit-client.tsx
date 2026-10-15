"use client";


import { readApiJson } from "@/lib/api";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/lang";

type ShareKit = {
  success: boolean;
  kit_ready: boolean;
  vendor?: { id: string; business_name: string; category_te?: string; category_en?: string; city?: string };
  package?: { code?: string; name: string; price: number; days?: number };
  expires_at?: string;
  telegram_post?: string;
  telegram_post_en?: string;
  telegram_post_te?: string;
  whatsapp_messages?: string[];
  whatsapp_messages_en?: string[];
  whatsapp_messages_te?: string[];
  channel_hint?: string;
  external_delivery?: string;
};

export default function VendorShareKitPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [vendorId, setVendorId] = useState("");
  const [token, setToken] = useState("");
  const [kit, setKit] = useState<ShareKit | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadKit = async (id = vendorId, accessCode = token) => {
    const cleanId = id.trim();
    const cleanToken = accessCode.trim();
    if (!cleanId || !cleanToken) {
      setError(te ? "Vendor ID మరియు registration లో వచ్చిన owner access code ఇవ్వండి." : "Enter your vendor ID and the owner access code from registration.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/vendors/${encodeURIComponent(cleanId)}/kit`, {
        headers: { "X-Vendor-Token": cleanToken },
        cache: "no-store",
      });
      const data = await readApiJson(response);
      if (!response.ok || !data.success) {
        setKit(null);
        setError(response.status === 410
          ? (te ? "ఈ ఒకరోజు promo kit access గడువు ముగిసింది." : "The one-day promo-kit access has expired.")
          : (data.detail || (te ? "Kit ఇంకా అందుబాటులో లేదు. Review పూర్తయ్యాక మళ్లీ ప్రయత్నించండి." : "The kit is not available yet. Try again after review is complete.")));
        return;
      }
      setVendorId(cleanId);
      setToken(cleanToken);
      setKit(data);
      try {
        localStorage.setItem("tsap_vendor_id", cleanId);
        localStorage.setItem("tsap_vendor_token", cleanToken);
      } catch { /* the form remains usable without browser storage */ }
    } catch {
      setKit(null);
      setError(te ? "Server నుంచి promo kit రాలేదు. మళ్లీ ప్రయత్నించండి." : "Could not load the promo kit. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let savedId = "";
    let savedToken = "";
    try {
      savedId = localStorage.getItem("tsap_vendor_id") || "";
      savedToken = localStorage.getItem("tsap_vendor_token") || "";
    } catch { /* use the explicit form below */ }
    const queryId = new URLSearchParams(window.location.search).get("vendor") || "";
    const id = queryId || savedId;
    setVendorId(id);
    setToken(savedToken);
    if (id && savedToken) void loadKit(id, savedToken);
    // Load only once on entry; subsequent requests are explicit user actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copyText = async (text: string, label: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      setNotice(te ? `${label} copy అయింది.` : `${label} copied.`);
    } catch {
      setNotice(te ? "Copy కాలేదు — text select చేసి స్వయంగా copy చేయండి." : "Copy failed — select and copy the text manually.");
    }
  };

  const telegramPost = kit ? (te ? kit.telegram_post_te : kit.telegram_post_en) || "" : "";
  const whatsappMessages = kit
    ? (te ? kit.whatsapp_messages_te : kit.whatsapp_messages_en) || []
    : [];

  const downloadPoster = async (style: "square" | "status") => {
    if (!kit || !vendorId || !token) return;
    setDownloading(style);
    setError("");
    try {
      const response = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}/kit/poster.png?style=${style}`, {
        headers: { "X-Vendor-Token": token },
        cache: "no-store",
      });
      if (!response.ok) {
        const data = await readApiJson(response).catch(() => ({}));
        throw new Error(data.detail || (te ? "Poster తయారు కాలేదు." : "Could not generate the poster."));
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `mana-vivaha-promo-${vendorId}-${style}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (te ? "Poster download విఫలమైంది." : "Poster download failed."));
    } finally {
      setDownloading("");
    }
  };

  return (
    <main className="min-h-dvh bg-cream px-4 py-8 pb-20">
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/vendors" className="inline-flex min-h-10 items-center text-sm font-bold text-maroon underline underline-offset-4">
          {te ? "← వెండర్ డైరెక్టరీ" : "← Vendor directory"}
        </Link>

        <section className="overflow-hidden rounded-3xl border border-gold/35 bg-white shadow-sm">
          <div className="maroon-gradient px-5 py-6 text-white sm:px-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-100">Mana Vivaha · మన వివాహ</p>
            <h1 className="mt-2 text-2xl font-black sm:text-3xl">{te ? "🧰 మీ Promo Share Kit" : "🧰 Your Promo Share Kit"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/90">
              {te
                ? "ఈ package share-ready text, poster materials మాత్రమే ఇస్తుంది. ఇది paid directory listing కాదు; external post, audience reach లేదా delivery హామీ లేదు."
                : "This package provides share-ready text and poster materials only. It is not a paid directory listing; external posting, audience reach, and delivery are not guaranteed."}
            </p>
          </div>

          <form className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-6" onSubmit={(event) => { event.preventDefault(); void loadKit(); }}>
            <label className="block text-xs font-bold text-gray-700">
              {te ? "Vendor ID" : "Vendor ID"}
              <input value={vendorId} onChange={(event) => setVendorId(event.target.value)} autoComplete="off" maxLength={40}
                placeholder={te ? "Registration ID" : "Your registration ID"}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon" />
            </label>
            <label className="block text-xs font-bold text-gray-700">
              {te ? "Owner access code" : "Owner access code"}
              <input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" maxLength={1000}
                placeholder={te ? "Registration సమయంలో వచ్చిన code" : "Code returned at registration"}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon" />
            </label>
            <button type="submit" disabled={busy} className="min-h-11 rounded-xl maroon-gradient px-5 py-2.5 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">
              {busy ? (te ? "⏳ లోడ్ అవుతోంది…" : "⏳ Loading…") : (te ? "Private kit తెరవండి" : "Open private kit")}
            </button>
          </form>
        </section>

        {error && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">{error}</p>}
        {notice && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

        {kit?.kit_ready && (
          <section className="space-y-4 rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{te ? "Review పూర్తయింది" : "Review complete"}</p>
                <h2 className="mt-1 break-words text-xl font-black text-maroon">{kit.vendor?.business_name || "Vendor promo kit"}</h2>
                <p className="mt-1 text-sm text-gray-600">
                  {[te ? kit.vendor?.category_te : kit.vendor?.category_en, kit.vendor?.city].filter(Boolean).join(" · ")}
                  {kit.package?.name ? ` · ${kit.package.name}` : ""}
                </p>
                {kit.package?.code === "V_SINGLE_POST" && kit.expires_at && (
                  <p className="mt-1 text-xs font-medium text-amber-800">
                    {te ? "ఒకరోజు kit access ముగింపు:" : "One-day kit access ends:"} {new Date(kit.expires_at).toLocaleString(te ? "te-IN" : "en-IN")}
                  </p>
                )}
              </div>
              <span className="w-fit rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                {te ? "Private share kit" : "Private share kit"}
              </span>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              {te
                ? "Text, poster ను స్వయంగా review చేసి మీరు నిర్వహించే channels/groups లో మాత్రమే share చేయండి. ఈ page ఏ Telegram/WhatsApp destination ను select చేయదు లేదా post చేయదు."
                : "Review the copy and poster yourself, then share only to destinations you control. This page does not select any Telegram/WhatsApp destination or publish for you."}
            </div>

            {!telegramPost && whatsappMessages.length === 0 && (
              <p role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {te ? "ఈ భాషలో share copy అందుబాటులో లేదు." : "Share copy is not available in English for this kit."}
              </p>
            )}

            {telegramPost && (
              <div className="rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-navy">{te ? "Share-ready promo copy" : "Share-ready promo copy"}</h3>
                  <button type="button" onClick={() => void copyText(telegramPost, "Promo copy")}
                    className="min-h-10 rounded-xl border border-maroon/30 px-3 py-2 text-xs font-bold text-maroon hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-maroon">
                    {te ? "Copy text" : "Copy text"}
                  </button>
                </div>
                <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-xs leading-6 text-gray-800">{telegramPost}</pre>
              </div>
            )}

            {whatsappMessages.map((message, index) => (
              <div key={`${index}-${message.slice(0, 16)}`} className="rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-navy">{index === 0 ? (te ? "WhatsApp status copy" : "WhatsApp status copy") : (te ? "Alternate share copy" : "Alternate share copy")}</h3>
                  <button type="button" onClick={() => void copyText(message, index === 0 ? "Status copy" : "Alternate copy")}
                    className="min-h-10 rounded-xl border border-emerald-700/30 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">
                    {te ? "Copy text" : "Copy text"}
                  </button>
                </div>
                <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-gray-50 p-3 text-xs leading-6 text-gray-800">{message}</pre>
              </div>
            ))}

            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              <button type="button" onClick={() => void downloadPoster("square")} disabled={!!downloading}
                className="min-h-11 rounded-xl bg-maroon px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
                {downloading === "square" ? (te ? "⏳ తయారవుతోంది…" : "⏳ Generating…") : (te ? "⬇️ Square poster" : "⬇️ Square poster")}
              </button>
              <button type="button" onClick={() => void downloadPoster("status")} disabled={!!downloading}
                className="min-h-11 rounded-xl border border-maroon/30 px-4 py-2.5 text-sm font-bold text-maroon disabled:opacity-60">
                {downloading === "status" ? (te ? "⏳ తయారవుతోంది…" : "⏳ Generating…") : (te ? "⬇️ Status poster" : "⬇️ Status poster")}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
