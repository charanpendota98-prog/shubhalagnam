"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ALL_CHANNELS, CHANNEL_STATS, CHANNEL_TIERS, Channel } from "@/lib/channels";
import { Duo } from "@/lib/duo";
import { useLang } from "@/lib/lang";
import { TelegramIcon, WhatsAppIcon } from "@/components/BrandIcons";
import { resolveChannelLinks, useChannelDirectoryLinks } from "@/lib/channel-links";

const CHANNEL_NAME_COLLATOR = new Intl.Collator("en", { sensitivity: "base", numeric: true });
const channelSortName = (name: string) => name.normalize("NFKD").replace(/^[^A-Za-z0-9]+/g, "").replace(/[^A-Za-z0-9]+/g, " ").trim();
const TELUGU_SCRIPT = /[\u0c00-\u0c7f]/;

function channelDisplayName(channel: Channel, telugu: boolean): string {
  if (telugu) return channel.name;
  // The registry label keeps its established English name before the separator;
  // links, usernames, and external destinations remain untouched.
  return channel.name.split("|")[0]?.trim() || "Channel listing";
}

function channelDisplayDescription(channel: Channel, telugu: boolean): string {
  if (telugu) return channel.desc;
  const englishSentences = channel.desc
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !TELUGU_SCRIPT.test(sentence.trim()));
  if (englishSentences.length) return englishSentences.join(" ").trim();
  if (channel.tier === "L1_REGION") {
    return "Regional directory listing for member-submitted profiles. Personal details are not independently verified; availability and posting frequency may vary.";
  }
  if (channel.tier === "L2_RELIGION") {
    return "Religion and community directory listing. Personal details are not independently verified; availability and posting frequency may vary.";
  }
  return "Selected community directory listing. Community names are not exhaustive; profile details and external channel availability are not independently verified.";
}

export default function ChannelsPage() {
  const { lang } = useLang();
  const te = lang === "te";
  const channelDirectory = useChannelDirectoryLinks();
  const [tier, setTier] = useState<string>("ALL");
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<"all" | "Bride" | "Groom">("all");

  // ?tier=L3_CASTE / ?q=reddy — apply deep-linked filters after first paint.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tier");
    const query = sp.get("q");
    const frame = window.requestAnimationFrame(() => {
      if (t && ["L0_OFFICIAL", "L1_REGION", "L2_RELIGION", "L3_CASTE", "L4_SPECIAL"].includes(t)) setTier(t);
      if (query) setQ(query);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ALL_CHANNELS.filter((c) => {
      const searchable = `${c.key} ${c.name} ${c.username} ${c.desc} ${c.hashtags.join(" ")}`.toLowerCase();
      const audience = `${c.key} ${c.name} ${c.desc}`.toLowerCase();
      return (tier === "ALL" || c.tier === tier) &&
        (gender === "all" || audience.includes(gender.toLowerCase())) &&
        (!needle || searchable.includes(needle));
    }).sort((a, b) =>
      a.tier.localeCompare(b.tier) || CHANNEL_NAME_COLLATOR.compare(channelSortName(a.name), channelSortName(b.name))
    );
  }, [tier, q, gender]);

  const directoryCounts = useMemo(() => {
    const resolved = ALL_CHANNELS.map((channel) => resolveChannelLinks(channel, channelDirectory));
    return {
      telegram: resolved.filter((links) => Boolean(links.telegram)).length,
      whatsapp: resolved.filter((links) => links.whatsappIsDirect).length,
    };
  }, [channelDirectory]);

  // Home and directory use one shared, format-checked link policy.
  const getLinks = (c: Channel) => resolveChannelLinks(c, channelDirectory);

  const listedChannels = list;

  return (
    <div className="min-h-dvh bg-[#FFF8E7] p-4 pb-36">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <Link href="/" className="text-sm font-bold text-[#7A0C2E] shrink-0">← {te ? "హోమ్" : "Home"}</Link>
          <div className="font-bold text-[#7A0C2E] text-sm sm:text-base truncate">📢 {te ? "మా ఛానళ్లు" : "Our Channels"}</div>
          <Link href="/register" className="hidden min-[380px]:inline-flex min-h-10 items-center text-xs bg-[#7A0C2E] text-white px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap">
            {te ? "ఉచిత నమోదు" : "Register FREE"}
          </Link>
        </div>

        {/* Hero + stats */}
        <div className="maroon-gradient rounded-[1.5rem] p-6 text-white">
          <h1 className="font-bold text-xl">📢 <Duo en="Mana Vivaha — Channel Directory" te="మన వివాహ — ఛానల్ డైరెక్టరీ" /></h1>
          <p className="text-xs sm:text-sm mt-2 opacity-90 leading-relaxed">
            {te
              ? <>ప్రొఫైల్ ఆమోదం తర్వాత, publishing configuration మరియు channel access అనుమతిస్తే సంబంధిత destination కు post queue కావచ్చు. Delivery హామీ కాదు. ఇక్కడి Telegram/WhatsApp links availability ను మేము ఆటోమేటిక్‌గా తనిఖీ చేయము.</>
              : <>After profile approval, a post may be queued for relevant destinations if publishing is configured and the service has access. Delivery is not guaranteed. Telegram and WhatsApp link availability is not checked automatically.</>}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { l: te ? "Directory listings" : "Channel listings", v: CHANNEL_STATS.total },
              { l: te ? "Telegram URLs" : "Telegram links listed", v: directoryCounts.telegram },
              { l: te ? "WhatsApp ఛానల్ links" : "WhatsApp channel links", v: directoryCounts.whatsapp },
              { l: te ? "కమ్యూనిటీ-వారీ listings" : "Community-specific listings", v: CHANNEL_STATS.by_tier.L3_CASTE },
            ].map((s) => (
              <div key={s.l} className="rounded-xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur-sm">
                <div className="text-2xl font-extrabold text-[#D4AF37]">{s.v}</div>
                <div className="text-[11px] leading-snug">{s.l}</div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-white/75">
            {te
              ? "ఇవి directory లో format-validated links మాత్రమే; Telegram/WhatsApp availability ఈ పేజీ తనిఖీ చేయదు."
              : "Counts show format-validated directory links only; this page does not check Telegram or WhatsApp availability."}
          </p>
        </div>

        {/* Filters */}
        <div className="mt-4 bg-white rounded-[1.5rem] p-4 card-shadow">
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={te ? "🔍 వెతకండి — Reddy, NRI, Brahmin..." : "🔍 Search — Reddy, NRI, Brahmin..."}
            className="w-full p-3 rounded-xl bg-gray-50 border text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7A0C2E]" aria-label={te ? "ఛానల్స్ వెతకండి" : "Search channels"} />
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" aria-pressed={tier === "ALL"} onClick={() => setTier("ALL")}
              className={`min-h-9 px-3 py-1.5 rounded-full text-xs font-bold border ${tier === "ALL" ? "maroon-gradient text-white" : "bg-white"}`}>
              {te ? "అన్నీ" : "All"} ({ALL_CHANNELS.length})
            </button>
            {CHANNEL_TIERS.map(t => (
              <button key={t.key} type="button" aria-pressed={tier === t.key} onClick={() => setTier(t.key)}
                className={`min-h-9 px-3 py-1.5 rounded-full text-xs font-bold border ${tier === t.key ? "maroon-gradient text-white" : "bg-white"}`}>
                {t.icon} {t.label} ({t.count})
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-2 items-center">
            <span className="text-[11px] font-bold text-gray-500">{te ? "రకం:" : "Type:"}</span>
            {(["all", "Bride", "Groom"] as const).map((g) => (
              <button key={g} type="button" aria-pressed={gender === g} onClick={() => setGender(g)}
                className={`min-h-9 px-3 py-1 rounded-full text-[11px] font-bold border ${gender === g ? "bg-[#7A0C2E] text-white" : "bg-white"}`}>
                {g === "all" ? (te ? "అన్నీ" : "All") : g === "Bride" ? "👰 Bride" : "🤵 Groom"}
              </button>
            ))}
            {(tier !== "ALL" || q || gender !== "all") && (
              <button type="button" onClick={() => { setTier("ALL"); setQ(""); setGender("all"); }}
                className="ml-auto min-h-9 rounded-full px-3 py-1 text-[11px] font-bold text-[#7A0C2E] underline underline-offset-2">
                {te ? "Filters clear చేయండి" : "Clear filters"}
              </button>
            )}
          </div>
          <p className="mt-3 text-[11px] font-medium text-slate-500" role="status" aria-live="polite">
            {te ? `${list.length} / ${ALL_CHANNELS.length} listings చూపిస్తున్నాం` : `Showing ${list.length} of ${ALL_CHANNELS.length} channel listings`}
          </p>
        </div>

        {/* Channel directory — links are listed but not reachability-checked */}
        {listedChannels.length > 0 && (
          <div className="mt-4 bg-white rounded-[1.5rem] p-5 card-shadow">
            <h2 className="font-bold text-[#7A0C2E] text-sm">{te ? `ఛానల్ listings (${listedChannels.length})` : `Channel directory (${listedChannels.length})`}</h2>
            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
              {te ? "ఈ పేజీ external link availability ను తనిఖీ చేయదు. ఇక్కడ channel కోసం owner-configured invite link మాత్రమే చూపిస్తాం; support contact ను channel link గా ఉపయోగించము." : "This page does not check external link availability. It shows only owner-configured channel invites; a support contact is never substituted for a channel link."}
            </p>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              {listedChannels.map((c: Channel) => {
                const lnk = getLinks(c);
                return (
                  <div key={c.key} className="border border-green-300/60 bg-green-50/30 rounded-2xl p-3.5 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-[14px] text-[#7A0C2E] truncate">{channelDisplayName(c, te)}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-100 text-slate-600 whitespace-nowrap">{te ? "లిస్టులో ఉంది" : "LISTED"}</span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1 line-clamp-2">{channelDisplayDescription(c, te)}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-green-200/40">
                      {lnk.telegram && (
                        <a href={lnk.telegram} target="_blank" rel="noopener noreferrer"
                          aria-label={te ? `${channelDisplayName(c, te)} Telegram listing తెరవండి` : `Open Telegram listing for ${channelDisplayName(c, te)}`}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#229ED9] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-soft transition hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E]">
                          <TelegramIcon className="w-3.5 h-3.5" mono />
                          <span>{te ? "Telegram link" : "Open Telegram"}</span>
                        </a>
                      )}
                      {lnk.whatsapp ? (
                        <a href={lnk.whatsapp} target="_blank" rel="noopener noreferrer"
                          aria-label={lnk.whatsappIsDirect
                            ? (te ? `${channelDisplayName(c, te)} WhatsApp channel తెరవండి` : `Open WhatsApp channel for ${channelDisplayName(c, te)}`)
                            : (te ? `${channelDisplayName(c, te)} గురించి WhatsApp support ని అడగండి` : `Ask WhatsApp support about ${channelDisplayName(c, te)}`)}
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#0b7d46] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-soft transition hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7A0C2E]">
                          <WhatsAppIcon className="w-3.5 h-3.5" mono />
                          <span>{lnk.whatsappIsDirect ? (te ? "WhatsApp ఛానల్" : "WhatsApp Channel") : (te ? "WhatsApp support" : "WhatsApp Support")}</span>
                        </a>
                      ) : (
                        <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[11px] font-semibold text-slate-500"
                          title={te ? "ఈ channel కోసం WhatsApp invite లేదా support contact configure చేయలేదు" : "No WhatsApp invite or support contact is configured for this channel"}>
                          <WhatsAppIcon className="w-3.5 h-3.5" mono />
                          <span>{te ? "లింక్ లేదు" : "No WhatsApp link"}</span>
                        </span>
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
          <div className="font-bold text-[#7A0C2E]">{te ? <>మన వివాహ — {CHANNEL_STATS.total} ఛానల్ listings</> : <>మన వివాహ — {CHANNEL_STATS.total} channel listings</>}</div>
          <div className="text-xs text-gray-500 mt-1">{te ? <>₹99 సంబంధం • మొదటి 3 FREE • external link availability ఆటోమేటిక్‌గా తనిఖీ చేయబడదు</> : <>₹99 Sambandham • First 3 FREE • external link availability is not checked automatically</>}</div>
          <div className="flex justify-center gap-3 mt-3">
            <Link href="/register" className="px-4 py-2 maroon-gradient text-white rounded-full text-xs font-bold">{te ? "FREE గా నమోదు చెయ్యండి" : "Register FREE"}</Link>
            <Link href="/matches" className="px-4 py-2 border border-[#D4AF37] text-[#7A0C2E] rounded-full text-xs font-bold">{te ? "సంబంధాలు చూడండి" : "Browse matches"}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
