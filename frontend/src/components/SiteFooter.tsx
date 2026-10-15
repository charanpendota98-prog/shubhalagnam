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
        { href: "/castes", teL: "సమాజాల వారీగా", enL: "Community directory" },
        { href: "/channels", teL: `${CHANNEL_STATS.total} channel directory listings`, enL: `${CHANNEL_STATS.total} channel directory listings` },
        { href: "/stories", teL: "విజయ గాథలు", enL: "Success stories" },
        { href: "/safety", teL: "Trust & Safety Center", enL: "Trust & Safety Center" },
      ],
    },

    {
      titleTe: "ధరలు & విధానాలు", titleEn: "Pricing & Policies",
      links: [
        { href: "/pricing", teL: "ధరలు (₹99 → ₹499)", enL: "Pricing (₹99 → ₹499)" },
        { href: "/refund", teL: "Refund & Cancellation", enL: "Refund & Cancellation" },
        { href: "/terms", teL: "సేవా నియమాలు", enL: "Terms of Use" },
        { href: "/privacy", teL: "గోప్యతా విధానం", enL: "Privacy Policy" },
      ],
    },
    {
      titleTe: "సంపాదించండి", titleEn: "Earn",
      links: [
        { href: "/referral", teL: "రెఫరల్ ప్రోగ్రామ్ & నిబంధనలు", enL: "Referral Program & Terms" },
        { href: "/referral/register", teL: "రెఫరర్‌గా చేరండి", enL: "Become a Referrer" },
        { href: "/bureau", teL: "Bureau / Broker B2B", enL: "Bureau / Broker B2B" },
        { href: "/vendors", teL: "వెడ్డింగ్ Vendors (18 categories)", enL: "Wedding Vendors (18 categories)" },
        { href: "/vendors/register", teL: "మీ business advertise — ₹149+", enL: "Advertise your business — ₹149+" },
      ],
    },
  ];

  return (
    <footer className="mt-10 navy-gradient text-white no-print">
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 text-sm">
        {/* Brand — 💍 R13: kotha marriage logo + peru Telugu lo */}
        <div>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_CONFIG.logoImage} alt={te ? "మన వివాహ logo" : "Mana Vivaha logo"} width={40} height={40}
              className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <div className="brand-wordmark brand-wordmark-dark font-bold leading-none telugu text-[18px]" aria-label="మన వివాహ">మన వివాహ</div>
              <div className="text-[10px] opacity-70">మన వివాహ • {te ? "తెలుగు వారి పవిత్ర మ్యాట్రిమోనీ" : "Telugu Authentic Matrimony"}</div>
            </div>
          </div>
          <div className="text-xs opacity-75 mt-3 telugu leading-relaxed">
            {te ? <>TS + AP తెలుగు మ్యాట్రిమోనీ. ₹99 కే సంబంధం — మొదటి 3 interest requests ఉచితం. Region • Religion • {CHANNEL_STATS.by_tier.L3_CASTE} community channel listings.</>
                : <>TS + AP Telugu Matrimony. ₹99 Sambandham — first 3 interest requests are free. Region • Religion • {CHANNEL_STATS.by_tier.L3_CASTE} community channel listings.</>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-white/10">{CHANNEL_STATS.total} channel listings</span>
            <span className="px-2.5 py-1 rounded-full bg-white/10">Telegram + configured WhatsApp</span>
            <span className="px-2.5 py-1 rounded-full bg-white/10">{te ? "Photo privacy settings" : "Photo privacy settings"}</span>
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
              te ? "ఫోన్ OTP ధృవీకరణ" : "Phone OTP verification",
              te ? "పబ్లిక్ ఆమోదానికి ముందు ప్రొఫైల్ సమీక్ష" : "Profile review before public approval",
              te ? "ఐచ్ఛిక photo privacy settings • generated cards లో watermark" : "Optional photo privacy settings • generated cards may carry a watermark",
              te ? "Owner accept తర్వాత accepted-request account views లో contact details; notification delivery హామీ లేదు" : "Contact details appear in accepted-request account views after owner acceptance; notification delivery is not guaranteed",
              te ? "అనుమానాస్పద ప్రొఫైల్‌ను report చేయండి" : "Report suspicious profiles",
            ].map((txt) => (
              <div key={txt} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" strokeWidth={2.25} aria-hidden="true" />
                <span>{txt}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs opacity-75">
            <div><Link href="/channels" className="underline underline-offset-2">{te ? "Configured channel listings" : "Configured channel listings"}</Link></div>
            <div>Site: {SITE_CONFIG.domain}</div>
            {SITE_CONFIG.supportEmail ? <div>{te ? "సహాయ ఈమెయిల్" : "Support email"}: <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="underline underline-offset-2">{SITE_CONFIG.supportEmail}</a></div> : null}
            {SITE_CONFIG.supportLink ? <div><a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{te ? "కాన్ఫిగర్ చేసిన WhatsApp సహాయం" : "Configured WhatsApp support"}</a></div> : null}
            {SITE_CONFIG.supportPhoneDisplay ? <div>{te ? "ఫోన్" : "Phone"}: <a href={`tel:${SITE_CONFIG.supportPhoneDisplay.replace(/[^\d+]/g, "")}`} className="underline underline-offset-2">{SITE_CONFIG.supportPhoneDisplay}</a></div> : null}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] opacity-70">
          <div className="inline-flex items-center gap-1">© {year} {SITE_CONFIG.brandName}{SITE_CONFIG.legalName ? ` (${SITE_CONFIG.legalName})` : ""} • Made for TS/AP with <Heart className="w-3 h-3 inline text-rose-400" fill="currentColor" strokeWidth={0} aria-hidden="true" /></div>
          <div className="inline-flex items-center gap-1.5 text-center md:text-right">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" strokeWidth={2.25} aria-hidden="true" />
            {te ? "Advance money అడిగితే వెంటనే report చెయ్యండి — మోసం జాగ్రత్త!" : "Report advance-money demands immediately — beware of fraud!"}
          </div>
        </div>
      </div>
    </footer>
  );
}
