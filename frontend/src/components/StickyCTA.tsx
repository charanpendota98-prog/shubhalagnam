"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";
import { Home, HeartHandshake, Wallet, Gift, UserCircle2, type LucideIcon } from "lucide-react";

/** Mobile app navigation — Modern, Thumb-friendly, Top Matrimony App Standard. */
/* R14 FIX: Pricing add చేశాం — desktop nav లో direct గా కనిపించేది, కానీ మొబైల్
 * bottom nav లో లేకపోవడం వల్ల మొబైల్ users కి hamburger menu తెరిచే వరకు
 * ధరలు చూసే direct access ఉండేది కాదు (audit flagged this). */
/* ADVANCED-PASS 1 — Emoji icons ని SiteHeader లో వాడిన అదే Lucide SVG icon
 * set తో replace చేశాం (Home/HeartHandshake/Wallet/Star/Gift/UserCircle2) —
 * ఇప్పుడు desktop header, Studios dropdown, మరియు ఈ mobile bottom nav అన్నీ
 * ఒకే consistent icon language వాడతాయి (design-system thinking), మరియు
 * active tab కి ఒక soft "pill" highlight + లేచినట్టు కనిపించే scale +
 * underline dot — ఇది Instagram/top-tier app స్థాయి bottom-nav feel ఇస్తుంది. */
const ITEMS: { href: string; icon: LucideIcon; te: string; en: string }[] = [
  { href: "/", icon: Home, te: "హోమ్", en: "Home" },
  { href: "/matches", icon: HeartHandshake, te: "సంబంధాలు", en: "Matches" },
  { href: "/pricing", icon: Wallet, te: "ధరలు", en: "Pricing" },
  { href: "/referral", icon: Gift, te: "రెఫరల్", en: "Referral" },
  { href: "/me", icon: UserCircle2, te: "నా అకౌంట్", en: "Account" },
];

export default function StickyCTA() {
  const pathname = usePathname();
  const { lang } = useLang();
  if (pathname?.startsWith("/register")) return null;

  return (
    <nav className="mobile-bottom-nav no-print lg:hidden border-t border-gold/30 bg-white/95 backdrop-blur-md shadow-lg" aria-label={lang === "te" ? "మొబైల్ నావిగేషన్" : "Mobile navigation"}>
      <div className="mx-auto flex h-[64px] max-w-lg items-center justify-around px-1.5">
        {ITEMS.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col items-center justify-center flex-1 h-full gap-0.5"
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`flex items-center justify-center w-9 h-7 rounded-full transition-all duration-200 ${
                  active ? "bg-maroon-soft scale-110" : "group-active:bg-gray-100"
                }`}
              >
                <Icon
                  className={`w-[19px] h-[19px] transition-colors ${active ? "text-maroon" : "text-gray-400 group-hover:text-maroon/70"}`}
                  strokeWidth={active ? 2.5 : 2}
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.12 : 0}
                  aria-hidden="true"
                />
              </span>
              <span className={`text-[10px] tracking-tight truncate transition-colors ${active ? "font-extrabold text-maroon" : "font-bold text-gray-500 group-hover:text-maroon/70"}`}>
                {lang === "te" ? item.te : item.en}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
