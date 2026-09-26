"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SITE_CONFIG } from "@/lib/site-config";
import { useSession, logout } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { Duo, duo } from "@/lib/duo";
import { LangToggle, useLang } from "@/lib/lang";

type NavItem = { href: string; en: string; te: string; icon: string; xl?: boolean };

/* Desktop pills — neat & clean single labels */
const NAV_MAIN: NavItem[] = [
  { href: "/", en: "Home", te: "Home", icon: "🏠" },
  { href: "/matches", en: "Matches", te: "Matches", icon: "💘" },
  { href: "/spotlight", en: "Spotlight", te: "Spotlight", icon: "🌟" },
  { href: "/channels", en: "Channels", te: "Channels", icon: "📢" },
  { href: "/castes", en: "Castes", te: "Castes", icon: "🪔" },
  { href: "/pricing", en: "Pricing", te: "Pricing", icon: "💰" },
  { href: "/referral", en: "Referral", te: "Referral", icon: "🤝" },
];

const NAV_EARN: NavItem[] = [
  { href: "/spotlight", en: "Promote Profile (Spotlight)", te: "ప్రొఫైల్ ప్రమోట్ (స్పాట్‌లైట్)", icon: "🌟" },
  { href: "/referral", en: "Referral dashboard", te: "రెఫరల్ డాష్‌బోర్డ్", icon: "🤝" },
  { href: "/referral/register", en: "Become a referrer", te: "రెఫరర్‌గా చేరండి", icon: "🎁" },
  { href: "/bureau", en: "Bureau (B2B)", te: "బ్యూరో (B2B)", icon: "🏛️" },
  { href: "/vendors/register", en: "List your business", te: "మీ business చేర్చండి", icon: "📝" },
];

const NAV_MORE: NavItem[] = [
  { href: "/me", en: "My Account", te: "నా అకౌంట్", icon: "🙋" },
  { href: "/biodata", en: "Biodata Maker", te: "బయోడేటా మేకర్", icon: "🎴" },
  { href: "/porutham", en: "Jyothishyam", te: "జ్యోతిషం", icon: "💍" },
  { href: "/muhurtham", en: "Muhurthams", te: "ముహూర్తాలు 2026-27", icon: "🗓️" },
  { href: "/stories", en: "Stories", te: "కథలు", icon: "💑" },
  { href: "/vendors", en: "Vendors", te: "వెండర్లు", icon: "🏪" },
  { href: "/safety", en: "Safety", te: "భద్రత", icon: "🛡️" },
  { href: "/verify", en: "Verify profile", te: "Profile verify", icon: "✅" },
];

/* 🔒 Admin (/admin, /growth, /admin/photos) is DELIBERATELY not linked anywhere in public UI
   (anti-scam) — team opens it by direct URL + X-Admin-Key only. */

export default function SiteHeader() {
  const pathname = usePathname();
  const { lang } = useLang();
  const te = lang === "te";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // 🔐 WAVE 13 — persistent session chip (login ayithe eppudu kanipisthundi)
  const { tsapId, token, ready } = useSession();
  const [sessionOk, setSessionOk] = useState(false);
  useEffect(() => {
    if (!ready || !token) { setSessionOk(false); return; }
    apiGet<{ valid?: boolean }>("/api/auth/verify").then(({ ok, data }) =>
      setSessionOk(!!(ok && (data as { valid?: boolean } | null)?.valid)));
  }, [ready, token]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const groupTitle = (en: string, teL: string) => (
    <div className="px-4 pt-3 pb-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-gold-deep">
      {te ? teL : en}
    </div>
  );

  const menuLink = (n: NavItem) => (
    <Link
      key={n.href}
      href={n.href}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
        isActive(n.href) ? "bg-maroon text-white shadow-soft" : "text-ink/80 hover:bg-white"
      }`}
    >
      <span className="w-6 text-center">{n.icon}</span>
      <Duo en={n.en} te={n.te} />
      {isActive(n.href) && <span className="ml-auto text-[10px] opacity-80">●</span>}
    </Link>
  );

  return (
    <header
      className={`sticky top-0 z-50 no-print border-b transition-all duration-300 ${
        scrolled ? "glass border-gold/30 shadow-soft" : "bg-cream border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        {/* Brand — 💍 Official Mana Vivaha Logo & Wordmark */}
        <Link href="/" className="flex items-center gap-2 min-w-0 flex-1 focus-brand rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE_CONFIG.logoImage} alt="మన వివాహ logo" width={40} height={40}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover shadow-gold shrink-0" />
          <div className="min-w-0">
            <div className="brand-wordmark font-bold truncate text-[18px] sm:text-[20px] telugu" aria-label="మన వివాహ">
              మన వివాహ <span className="font-normal text-xs text-amber-700 hidden sm:inline">Mana Vivaha</span>
            </div>
            <div className="hidden sm:block text-[10px] text-gray-500 leading-tight truncate telugu">
              {te ? "తెలుగు వారి పవిత్ర మ్యాట్రిమోనీ" : "Telugu Authentic Matrimony"}
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
          {NAV_MAIN.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={duo(n.en, n.te)}
              className={`${n.xl ? "hidden xl:inline-flex" : ""} px-3.5 py-2 rounded-full text-[13px] font-semibold transition ${
                isActive(n.href)
                  ? "bg-maroon text-white shadow-soft"
                  : "text-ink/75 hover:text-maroon hover:bg-maroon-soft"
              }`}
            >
              {n.icon} {te ? n.te : n.en}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LangToggle compact />
          <Link
            href="/porutham"
            className="hidden md:inline-flex px-3.5 py-2 text-[13px] font-semibold border border-maroon/30 text-maroon rounded-full hover:bg-maroon-soft transition"
          >
            💍 <Duo en="Jyothishyam" te="జ్యోతిషం" />
          </Link>
          {ready && tsapId && sessionOk ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-full">
              <Link href="/me" className="hover:underline">👤 {tsapId.length > 14 ? `${tsapId.slice(0, 9)}…${tsapId.slice(-4)}` : tsapId}</Link>
              <button
                onClick={() => { logout(); window.location.href = "/"; }}
                className="ml-1 rounded-full bg-emerald-200 px-2 py-0.5 text-[11px] font-bold hover:bg-emerald-300"
                aria-label="Logout"
              >
                ⎋
              </button>
            </span>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex px-3.5 py-2 text-[13px] font-bold border border-maroon/30 text-maroon rounded-full hover:bg-maroon-soft transition"
            >
              📱 Login
            </Link>
          )}
          <Link
            href="/register"
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-[12px] sm:text-[13px] font-black maroon-gradient text-white shadow-soft hover:shadow-brand transition whitespace-nowrap"
          >
            <span>ఉచిత నమోదు</span>
          </Link>
          <button
            aria-label={te ? "మెనూ" : "Menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden w-10 h-10 rounded-xl border border-maroon/20 flex items-center justify-center text-maroon focus-brand"
          >
            <span className="relative block w-5 h-3.5">
              <span
                className={`absolute left-0 h-0.5 w-5 bg-maroon rounded transition-all ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-0.5 w-5 bg-maroon rounded transition-all ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-5 bg-maroon rounded transition-all ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu card — grouped + scrollable */}
      <div
        id="mobile-menu"
        className={`lg:hidden overflow-hidden transition-all duration-300 ${
          open ? "max-h-[75vh]" : "max-h-0"
        }`}
      >
        <div className="glass border-t border-gold/25 px-4 pt-1 pb-4 max-h-[75vh] overflow-y-auto overscroll-contain menu-scroll">
          {groupTitle("Main", "మెయిన్")}
          <div className="space-y-1">
            {NAV_MAIN.filter((n) => !n.xl).map(menuLink)}
          </div>
          {groupTitle("Earn", "సంపాదించండి")}
          <div className="space-y-1">
            {NAV_EARN.map(menuLink)}
          </div>
          {groupTitle("More", "మరిన్ని")}
          <div className="space-y-1">
            {NAV_MORE.map(menuLink)}
          </div>
          <div className="flex gap-2 pt-3">
            <Link
              href="/matches"
              className="flex-1 text-center px-4 py-3 rounded-xl border border-maroon/25 text-maroon text-sm font-bold"
            >
              <Duo en="🔍 Search matches" te="🔍 సంబంధాలు వెతకండి" />
            </Link>
            <a
              href={SITE_CONFIG.officialChannelUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center px-4 py-3 rounded-xl gold-gradient text-maroon text-sm font-bold"
            >
              <Duo en="Telegram Channel" te="టెలిగ్రామ్ ఛానల్" />
            </a>
          </div>
          <div className="flex justify-center pt-3">
            <LangToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
