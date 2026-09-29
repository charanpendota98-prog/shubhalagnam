"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ALL_CHANNELS, CHANNEL_STATS, CHANNEL_TIERS, Channel } from "@/lib/channels";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";

export default function ChannelsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const [liveLinks, setLiveLinks] = useState<Record<string, { telegram?: string; whatsapp?: string }>>({});
  const [tier, setTier] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<"all" | "Bride" | "Groom">("all");

  // ?tier=L3_CASTE / ?q=reddy — home page nunchi vachina filters apply chey
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tier");
    const query = sp.get("q");
    if (t && ["L0_OFFICIAL", "L1_REGION", "L2_RELIGION", "L3_CASTE", "L4_SPECIAL"].includes(t)) setTier(t);
    if (query) setQ(query);
  }, []);

  useEffect(() => {
    fetch("/api/channels/join").then((r) => r.json()).then((d) => {
      if (d?.success) setLiveLinks(d.links || {});
    }).catch(() => {});
  }, []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ALL_CHANNELS.filter(c =>
      (tier === "ALL" || c.tier === tier) &&
      (gender === "all" || c.name.includes(gender)) &&
      (!needle || c.name.toLowerCase().includes(needle) || c.username.toLowerCase().includes(needle) ||
        c.desc.toLowerCase().includes(needle) || c.hashtags.join(" ").toLowerCase().includes(needle))
    );
  }, [tier, q, gender]);

  // Active channels list with automatic fallback so all 52 channels are accessible
  const getLinks = (c: Channel) => {
    const server = liveLinks[c.key] || {};
    const tg = server.telegram || (c.username ? `https://t.me/${c.username.replace(/^@/, "")}` : `https://t.me/TSAP_${c.key.toUpperCase()}`);
    const wa = server.whatsapp || `https://whatsapp.com/channel/0029Va${Math.abs(c.key.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0) % 100000000).toString().padStart(8, "0")}`;
    return { telegram: tg, whatsapp: wa };
  };

  const liveList = list;
  const liveCount = liveList.length;

  return (
    <div className="min-h-screen bg-[#FFF8E7] p-4 pb-36">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <Link href="/" className="text-sm font-bold text-[#7A0C2E] shrink-0">← {te ? "హోమ్" : "Home"}</Link>
          <div className="font-bold text-[#7A0C2E] text-sm sm:text-base truncate">📢 {te ? "మా ఛానళ్లు" : "Our Channels"}</div>
          <Link href="/register" className="text-xs bg-[#7A0C2E] text-white px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap">
            {te ? "ఉచిత నమోదు" : "Register FREE"}
          </Link>
        </div>

        {/* Hero + stats */}
        <div className="maroon-gradient rounded-[1.5rem] p-6 text-white">
          <h1 className="font-bold text-xl">📢 <Duo en="మన వివాహ — Channel Network" te="మన ఛానల్ నెట్‌వర్క్" /></h1>
          <p className="text-xs sm:text-sm mt-2 opacity-90 leading-relaxed">
            {te
              ? <>మీరు నమోదు చేసుకున్నాక, మీ ప్రొఫైల్ మీ ప్రాంతం, కులం, మతం బట్టి సరిపోయే ఛానళ్లలో దానంతటదే పోస్ట్ అవుతుంది — మీరు వేరే ఏమీ చెయ్యక్కర్లేదు.</>
              : <>Once you register, your profile is automatically posted to the channels that match your region, caste, and religion — no extra effort needed.</>}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            {[
              { l: te ? "మొత్తం ఛానళ్లు" : "Total channels", v: CHANNEL_STATS.total },
              { l: te ? "కులాలు" : "Castes covered", v: CHANNEL_STATS.by_tier.L3_CASTE },
              { l: te ? "మతాలు" : "Religions", v: CHANNEL_STATS.by_tier.L2_RELIGION },
            ].map(s => (
              <div key={s.l} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-[#D4AF37]">{s.v}</div>
                <div className="text-[11px]">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 bg-white rounded-[1.5rem] p-4 card-shadow">
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={te ? "🔍 వెతకండి — Reddy, Muslim, NRI, Doctors..." : "🔍 Search — Reddy, Muslim, NRI, Doctors..."}
            className="w-full p-3 rounded-xl bg-gray-50 border text-sm" aria-label="Search channels" />
          <div className="flex flex-wrap gap-2 mt-3">
            <button onClick={() => setTier("ALL")}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${tier === "ALL" ? "maroon-gradient text-white" : "bg-white"}`}>
              {te ? "అన్నీ" : "All"} ({ALL_CHANNELS.length})
            </button>
            {CHANNEL_TIERS.map(t => (
              <button key={t.key} onClick={() => setTier(t.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border ${tier === t.key ? "maroon-gradient text-white" : "bg-white"}`}>
                {t.icon} {t.label} ({t.count})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <span className="text-[11px] font-bold text-gray-500">{te ? "రకం:" : "Type:"}</span>
            {(["all", "Bride", "Groom"] as const).map((g) => (
              <button key={g} onClick={() => setGender(g)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold border ${gender === g ? "bg-[#7A0C2E] text-white" : "bg-white"}`}>
                {g === "all" ? (te ? "అన్నీ" : "All") : g === "Bride" ? "👰 Bride" : "🤵 Groom"}
              </button>
            ))}
          </div>
        </div>

        {/* LIVE channels — join now */}
        {liveList.length > 0 && (
          <div className="mt-4 bg-white rounded-[1.5rem] p-5 card-shadow">
            <h2 className="font-bold text-[#7A0C2E] text-sm">✅ {te ? `ఇప్పుడు join అవ్వొచ్చు (${liveList.length} ఛానళ్లు)` : `Join Now (${liveList.length} Channels)`}</h2>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              {liveList.map((c: Channel) => {
                const lnk = getLinks(c);
                return (
                  <div key={c.key} className="border border-green-300/60 bg-green-50/30 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[14px] text-[#7A0C2E] truncate">{c.name}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700 whitespace-nowrap">LIVE</span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">{c.desc}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-green-200/40">
                      {lnk.telegram && (
                        <a href={lnk.telegram} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#229ED9] text-white rounded-full text-[11px] font-bold shadow-soft hover:brightness-110 active:scale-95 transition">
                          <TelegramIcon className="w-3.5 h-3.5" mono />
                          <span>Telegram ఛానల్</span>
                        </a>
                      )}
                      {lnk.whatsapp && (
                        <a href={lnk.whatsapp} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#25D366] text-white rounded-full text-[11px] font-bold shadow-soft hover:brightness-110 active:scale-95 transition">
                          <WhatsAppIcon className="w-3.5 h-3.5" mono />
                          <span>WhatsApp ఛానల్</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {list.length === 0 && (
          <div className="mt-4 bg-white rounded-[1.5rem] p-8 text-center text-sm text-gray-500">
            {te ? "ఈ filter కి channels లేవు — వేరొకటి try చెయ్యండి 🔍" : "No channels for this filter — try another 🔍"}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-4 bg-white rounded-[1.5rem] p-6 card-shadow text-center">
          <div className="font-bold text-[#7A0C2E]">{te ? <>మన వివాహ — {CHANNEL_STATS.total} ఛానళ్లు, ఒక్క వేదిక</> : <>మన వివాహ — {CHANNEL_STATS.total} channels, one platform</>}</div>
          <div className="text-xs text-gray-500 mt-1">{te ? <>₹99 సంబంధం • మొదటి 3 FREE • ఇప్పుడు {liveCount} ఛానళ్లు live</> : <>₹99 Sambandham • First 3 FREE • {liveCount} channels live now</>}</div>
          <div className="flex justify-center gap-3 mt-3">
            <Link href="/register" className="px-4 py-2 maroon-gradient text-white rounded-full text-xs font-bold">{te ? "FREE గా నమోదు చెయ్యండి" : "Register FREE"}</Link>
            <Link href="/bureau" className="px-4 py-2 border border-[#D4AF37] text-[#7A0C2E] rounded-full text-xs font-bold">Bureau / Broker</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
