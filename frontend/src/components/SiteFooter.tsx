"use client";
import Link from "@/components/LocaleLink";
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
        { href: "/register", teL: "ఉచితంగా నమోదు చేసుకోండి", enL: "Register (FREE)" },
        { href: "/matches", teL: "సంబంధాలు, వడపోతలు", enL: "Matches & Filters" },
        { href: "/second-marriage", teL: "పునర్వివాహం", enL: "Second Marriage (Remarriage)" },
        { href: "/districts", teL: "జిల్లాల వారీగా సంబంధాలు (తెలంగాణ/ఆంధ్రప్రదేశ్)", enL: "TS & AP Districts Hub" },
        { href: "/compare", teL: "సంబంధాల పోలిక స్టూడియో", enL: "Profile Compare Studio" },
        { href: "/pelli-choopulu", teL: "పెళ్లి చూపుల గైడ్", enL: "Pelli Choopulu Guide" },
        { href: "/lagna-patrika", teL: "శుభ లగ్న పత్రిక స్టూడియో", enL: "Lagna Patrika Studio" },
        { href: "/biodata", teL: "బయోడేటా తయారు చేసుకోండి", enL: "Biodata Studio" },
        { href: "/muhurtham", teL: "వివాహ ముహూర్తాలు 2026-27", enL: "Vivaha Muhurthams 2026-27" },
        { href: "/castes", teL: "సమాజాల వారీగా", enL: "Community directory" },
        { href: "/channels", teL: `${CHANNEL_STATS.total} ఛానళ్ల వివరాలు`, enL: `${CHANNEL_STATS.total} channel directory listings` },
        { href: "/stories", teL: "విజయ గాథలు", enL: "Success stories" },
        { href: "/events", teL: "పరిచయ వేదికలు, పెళ్లి సేవల ప్యాకేజీలు", enL: "Community Events & Bundles" },
        { href: "/safety", teL: "నమ్మకం, భద్రత సమాచారం", enL: "Trust & Safety Center" },
      ],
    },

    {
      titleTe: "ధరలు, విధానాలు", titleEn: "Pricing & Policies",
      links: [
        { href: "/pricing", teL: "ధరలు (₹99 → ₹499)", enL: "Pricing (₹99 → ₹499)" },
        { href: "/refund", teL: "వాపసు, రద్దు నిబంధనలు", enL: "Refund & Cancellation" },
        { href: "/terms", teL: "సేవా నియమాలు", enL: "Terms of Use" },
        { href: "/privacy", teL: "గోప్యతా విధానం", enL: "Privacy Policy" },
        { href: "/status", teL: "సేవల ప్రస్తుత స్థితి", enL: "System Status" },
      ],
    },
    {
      titleTe: "సంపాదించండి", titleEn: "Earn",
      links: [
        { href: "/referral", teL: "స్నేహితుల పరిచయ పథకం, నిబంధనలు", enL: "Referral Program & Terms" },
        { href: "/referral/register", teL: "పరిచయ పథకంలో చేరండి", enL: "Become a Referrer" },
        { href: "/bureau", teL: "పెళ్లి సంబంధాల బ్యూరోలు, మధ్యవర్తులు", enL: "Bureau / Broker B2B" },
        { href: "/vendors", teL: "పెళ్లి సేవల వ్యాపారులు (18 రకాలు)", enL: "Wedding Vendors (18 categories)" },
        { href: "/vendors/register", teL: "మీ వ్యాపార ప్రకటన ఇవ్వండి. ₹149 నుంచి", enL: "Advertise your business — ₹149+" },
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
            <img src={SITE_CONFIG.logoImage} alt={te ? "మన వివాహ చిహ్నం" : "Mana Vivaha logo"} width={40} height={40}
              className="w-10 h-10 rounded-xl object-cover" />
            <div>
              <div className="brand-wordmark brand-wordmark-dark font-bold leading-none telugu text-[18px]">మన వివాహ</div>
              <div className="text-[10px] opacity-70">మన వివాహ • {te ? "తెలుగు వారి పవిత్ర మ్యాట్రిమోనీ" : "Telugu Authentic Matrimony"}</div>
            </div>
          </div>
          <div className="text-xs opacity-75 mt-3 telugu leading-relaxed">
            {te ? <>తెలంగాణ, ఆంధ్రప్రదేశ్ తెలుగు వివాహ పరిచయ వేదిక. మొదటి 3 అభ్యర్థనలు ఉచితం. ప్లాన్లు ₹99 నుంచి. ప్రాంతం, మతం, సమాజాల వారీగా {CHANNEL_STATS.by_tier.L3_CASTE} ఛానళ్ల వివరాలు.</>
                : <>TS + AP Telugu Matrimony. ₹99 Sambandham — first 3 interest requests are free. Region • Religion • {CHANNEL_STATS.by_tier.L3_CASTE} community channel listings.</>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
            <span className="px-2.5 py-1 rounded-full bg-white/10">{te ? `మొత్తం ${CHANNEL_STATS.total} వివరాలు (${CHANNEL_STATS.by_tier.L3_CASTE} సమాజాల వారీగా)` : `${CHANNEL_STATS.total} total directory listings (${CHANNEL_STATS.by_tier.L3_CASTE} community)`}</span>
            <span className="px-2.5 py-1 rounded-full bg-white/10">{te ? "Telegram, అమల్లో ఉన్న WhatsApp సేవలు" : "Telegram + configured WhatsApp"}</span>
            <span className="px-2.5 py-1 rounded-full bg-white/10">{te ? "ఫోటో గోప్యత ఎంపికలు" : "Photo privacy settings"}</span>
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
                    <Link href={l.href} className="inline-flex min-h-11 items-center gap-1.5 py-1 opacity-75 transition hover:text-gold hover:opacity-100">
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
            {te ? "నమ్మకం, భద్రత" : "Trust & Safety"}
          </div>
          <div className="mt-3 space-y-2 text-xs opacity-85">
            {[
              te ? "పాస్‌వర్డ్‌తో ఖాతా యాక్సెస్" : "Password-protected account access",
              te ? "పబ్లిక్ ఆమోదానికి ముందు ప్రొఫైల్ సమీక్ష" : "Profile review before public approval",
              te ? "మీ ఫోటో ఎవరికి కనిపించాలో ఎంచుకోవచ్చు. తయారైన కార్డులపై వాటర్‌మార్క్ ఉండవచ్చు" : "Optional photo privacy settings • generated cards may carry a watermark",
              te ? "ఎదుటి వ్యక్తి అంగీకరించాకే మీ ఖాతాలో ఆ అభ్యర్థన వద్ద సంప్రదింపు వివరాలు కనిపిస్తాయి. సందేశం తప్పక చేరుతుందని హామీ లేదు" : "Contact details appear in accepted-request account views after owner acceptance; notification delivery is not guaranteed",
              te ? "అనుమానాస్పద ప్రొఫైల్‌పై ఫిర్యాదు చేయండి" : "Report suspicious profiles",
            ].map((txt) => (
              <div key={txt} className="flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" strokeWidth={2.25} aria-hidden="true" />
                <span>{txt}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-xs opacity-75">
            <div><Link href="/channels" className="inline-flex min-h-11 items-center py-1 underline underline-offset-2">{te ? "నమోదైన ఛానళ్ల వివరాలు" : "Configured channel listings"}</Link></div>
            <div>Telegram: {SITE_CONFIG.officialChannel}</div>
            <div>{te ? "వెబ్‌సైట్" : "Site"}: {SITE_CONFIG.domain}</div>
            {SITE_CONFIG.supportEmail ? <div>{te ? "సహాయ ఈమెయిల్" : "Support email"}: <a href={`mailto:${SITE_CONFIG.supportEmail}`} className="underline underline-offset-2">{SITE_CONFIG.supportEmail}</a></div> : null}
            {SITE_CONFIG.supportLink ? <div><a href={SITE_CONFIG.supportLink} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{te ? "WhatsAppలో సహాయం" : "Configured WhatsApp support"}</a></div> : null}
            {SITE_CONFIG.supportPhoneDisplay ? <div>{te ? "ఫోన్" : "Phone"}: <a href={`tel:${SITE_CONFIG.supportPhoneDisplay.replace(/[^\d+]/g, "")}`} className="underline underline-offset-2">{SITE_CONFIG.supportPhoneDisplay}</a></div> : null}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[11px] opacity-70">
          <div className="inline-flex items-center gap-1">© {year} {SITE_CONFIG.brandName}{SITE_CONFIG.legalName ? ` (${SITE_CONFIG.legalName})` : ""} • {te ? "తెలంగాణ, ఆంధ్రప్రదేశ్ కోసం ప్రేమతో" : "Made for TS/AP with"} <Heart className="w-3 h-3 inline text-rose-400" fill="currentColor" strokeWidth={0} aria-hidden="true" /></div>
          <div className="inline-flex items-center gap-1.5 text-center md:text-right">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" strokeWidth={2.25} aria-hidden="true" />
            {te ? "ముందుగా డబ్బు అడిగితే జాగ్రత్త. వివరాలు నిర్ధారించండి. అనుమానంగా ఉంటే ఫిర్యాదు చేయండి." : "Report advance-money demands immediately — beware of fraud!"}
          </div>
        </div>
      </div>
    </footer>
  );
}
