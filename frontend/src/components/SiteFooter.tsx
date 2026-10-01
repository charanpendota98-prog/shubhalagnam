"use client";
import Link from "next/link";
import { useLang } from "@/lib/lang";
import { CHANNEL_STATS } from "@/lib/channels";
import { SITE_CONFIG } from "@/lib/site-config";
import {
  RefreshCw, MapPin, Scale, Coffee, ScrollText, IdCard, CalendarDays,
  CheckCircle2, AlertTriangle, Heart, type LucideIcon,
} from "lucide-react";

export default function SiteFooter() {
  const { lang } = useLang();
  const te = lang === "te";
  const year = new Date().getFullYear();
  /* ADVANCED-PASS 1 — same href-keyed icon language as SiteHeader/StickyCTA
     (design-system consistency); emoji were baked straight into the link
     label strings here, which looked inconsistent once the header switched
     to vector icons. */
  const linkIcon: Record<string, LucideIcon> = {
    "/second-marriage": RefreshCw,
    "/districts": MapPin,
    "/compare": Scale,
    "/pelli-choopulu": Coffee,
    "/lagna-patrika": ScrollText,
    "/biodata": IdCard,
    "/muhurtham": CalendarDays,
  };
  const cols: { titleTe: string; titleEn: string; links: { href: string; teL: string; enL: string }[] }[] = [
    {
      titleTe: "చూడండి", titleEn: "Explore",
      links: [
        { href: "/register", teL: "ఉచిత నమోదు (Register FREE)", enL: "Register (FREE)" },
        { href: "/matches", teL: "సంబంధాలు & ఫిల్టర్లు", enL: "Matches & Filters" },
        { href: "/second-marriage", teL: "పునర్వివాహం (Second Marriage)", enL: "Second Marriage (Remarriage)" },
        { href: "/districts", teL: "జిల్లా సమగ్ర సంబంధాలు (TS/AP)", enL: "TS & AP Districts Hub" },
        { href: "/compare", teL: "సంబంధాల పోలిక స్టూడియో", enL: "Profile Compare Studio" },
        { href: "/pelli-choopulu", teL: "పెళ్లి చూపుల గైడ్", enL: "Pelli Choopulu Guide" },
        { href: "/lagna-patrika", teL: "శుభ లగ్న పత్రిక స్టూడియో", enL: "Lagna Patrika Studio" },
        { href: "/biodata", teL: "బయోడేటా మేకర్ (Biodata Studio)", enL: "Biodata Studio" },
        { href: "/muhurtham", teL: "వివాహ ముహూర్తాలు 2026-27", enL: "Vivaha Muhurthams 2026-27" },
        { href: "/castes", teL: "కులాల వారీగా (43 Castes)", enL: "Caste-wise (43 Castes)" },
        { href: "/channels", teL: `అన్ని ${CHANNEL_STATS.total} Channels`, enL: `All ${CHANNEL_STATS.total} Channels` },
        { href: "/stories", teL: "విజయ గాథలు", enL: "Success stories" },
        { href: "/porutham", teL: "వేద జ్యోతిషం — గుణమేళనం", enL: "Jyothishyam — Gunamelanam" },
        { href: "/safety", teL: "Trust & Safety Center", enL: "Trust & Safety Center" },
      ],
    },

    {
      titleTe: "ధరలు & విధానాలు", titleEn: "Pricing & Policies",
      links: [
        { href: "/pricing", teL: "ధరలు (₹29 → ₹499)", enL: "Pricing (₹29 → ₹499)" },
        { href: "/refund", teL: "Refund & Cancellation", enL: "Refund & Cancellation" },
        { href: "/terms", teL: "సేవా నియమాలు", enL: "Terms of Use" },
        { href: "/privacy", teL: "గోప్యతా విధానం", enL: "Privacy Policy" },
      ],
    },
    {
      titleTe: "సంపాదించండి", titleEn: "Earn",
      links: [
        { href: "/referral", teL: "రెఫరల్ — ₹50/profile", enL: "Referral — ₹50/profile" },
        { href: "/referral/register", teL: "రెఫరర్‌గా చేరండి", enL: "Become a Referrer" },
        { href: "/bureau", teL: "Bureau / Broker B2B", enL: "Bureau / Broker B2B" },
        { href: "/vendors", teL: "వెడ్డింగ్ Vendors (18 categories)", enL: "Wedding Vendors (18 categories)" },
        { href: "/vendors/register", teL: "మీ business advertise — ₹149+", enL: "Advertise your business — ₹149+" },
      ],
    },
  ];

  return (
    <footer className="mt-10 navy-gradient text-white no-print">
      <div className="max-w-7xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-8 text-sm">
        {/* Brand — 💍 R13: kotha marriage logo + peru Telugu lo */}
        <div>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_CONFIG.logoImage} alt="మన వివాహ logo" width={40} height={40}
              className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <div className="brand-wordmark brand-wordmark-dark font-bold leading-none telugu text-[18px]" aria-label="మన వివాహ">మన వివాహ</div>
              <div className="text-[10px] opacity-70">మన వివాహ • {te ? "తెలుగు వారి పవిత్ర మ్యాట్రిమోనీ" : "Telugu Authentic Matrimony"}</div>
            </div>
          </div>
          <div className="text-xs opacity-75 mt-3 telugu leading-relaxed">
            {te ? <>TS + AP తెలుగు మ్యాట్రిమోనీ. ₹99 కే సంబంధం — మొదటి 3 ప్రొఫైళ్లు FREE. Region • Religion • {CHANNEL_STATS.by_tier.L3_CASTE} Castes • Special channels.</>
                : <>TS + AP Telugu Matrimony. ₹99 Sambandham — first 3 profiles FREE. Region • Religion • {CHANNEL_STATS.by_tier.L3_CASTE} Castes • Special channels.</>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-white/10">{CHANNEL_STATS.total} Channels</span>
            <span className="px-2.5 py-1 rounded-full bg-white/10">Telegram + WhatsApp</span>
            <span className="px-2.5 py-1 rounded-full bg-white/10">{te ? "Photo Private" : "Photo Private"}</span>
          </div>
        </div>

        {cols.map((c) => (
          <div key={c.titleEn}>
            <div className="font-bold text-gold text-[13px] uppercase tracking-wide">{te ? c.titleTe : c.titleEn}</div>
            <div className="mt-3 space-y-2 text-xs">
              {c.links.map((l) => {
                const Icon = linkIcon[l.href];
                return (
                  <div key={l.href}>
                    <Link href={l.href} className="inline-flex items-center gap-1.5 opacity-75 hover:opacity-100 hover:text-gold transition">
                      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />}
                      {te ? l.teL : l.enL}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Trust + contact */}
        <div>
          <div className="font-bold text-gold text-[13px] uppercase tracking-wide">
            {te ? "నమ్మకం & భద్రత" : "Trust & Safety"}
          </div>
          <div className="mt-3 space-y-2 text-xs opacity-85">
            {[
              te ? "OTP verified numbers" : "OTP verified numbers",
              te ? "DOB verified badge" : "DOB verified badge",
              te ? "Photo watermark + private mode" : "Photo watermark + private mode",
              te ? "Accept తర్వాతే నంబర్" : "Number only after accept",
              te ? "3 reports → auto hide" : "3 reports → auto hide",
            ].map((txt) => (
              <div key={txt} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" strokeWidth={2.25} aria-hidden="true" />
                <span>{txt}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs opacity-75">
            <div>Telegram: {SITE_CONFIG.officialChannel}</div>
            <div>Site: {SITE_CONFIG.domain}</div>
            <div>Care: {SITE_CONFIG.supportEmail}</div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        {/* pb-28 → mobile sticky CTA bar ee lines moopu koorchukuni undadu (overlap fix) */}
        <div className="max-w-7xl mx-auto px-4 pt-4 pb-28 lg:pb-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] opacity-70">
          <div className="inline-flex items-center gap-1">© {year} {SITE_CONFIG.brandName} ({SITE_CONFIG.legalName}) • Made for TS/AP with <Heart className="w-3 h-3 inline text-rose-400" fill="currentColor" strokeWidth={0} aria-hidden="true" /></div>
          <div className="inline-flex items-center gap-1.5 text-center md:text-right">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" strokeWidth={2.25} aria-hidden="true" />
            {te ? "Advance money అడిగితే వెంటనే report చెయ్యండి — మోసం జాగ్రత్త!" : "Report advance-money demands immediately — beware of fraud!"}
          </div>
        </div>
      </div>
    </footer>
  );
}
