"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SITE_CONFIG } from "@/lib/site-config";
import { useSession, logout } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { Duo, duo } from "@/lib/duo";
import { LangToggle, useLang } from "@/lib/lang";
import {
  Home, HeartHandshake, RefreshCw, Star, Megaphone, Users, Wallet, Gift,
  Sparkles, ChevronDown, ScrollText, Scale, Coffee, IdCard, MapPin,
  CalendarDays, BookOpen, Store, ShieldCheck, BadgeCheck, UserCircle2,
  UserPlus, Landmark, ClipboardList, LogOut, Smartphone, Search,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; en: string; te: string; icon: string; xl?: boolean };

/* ADVANCED-PASS 1 — Design system upgrade: emoji icons (🏠💘📢 etc.) swapped
   for a crisp, consistent SVG icon set. Emoji render wildly differently
   across OS/browser/font (chunky color glyphs on Android, thin outline on
   iOS, missing glyphs on some Linux fonts) which reads as "amateur" on a
   premium matrimony brand — a single vector icon set looks identical and
   polished everywhere. Keyed by href so the *same* destination always gets
   the *same* icon across desktop pills, the Studios dropdown and the
   mobile menu. The `icon` emoji field stays in NAV_* arrays (future-proof/
   backward compatible) but is no longer rendered directly. */
const ICON_MAP: Record<string, LucideIcon> = {
  "/": Home,
  "/matches": HeartHandshake,
  "/second-marriage": RefreshCw,
  "/spotlight": Star,
  "/channels": Megaphone,
  "/castes": Users,
  "/pricing": Wallet,
  "/referral": Gift,
  "/referral/register": UserPlus,
  "/bureau": Landmark,
  "/vendors/register": ClipboardList,
  "/districts": MapPin,
  "/compare": Scale,
  "/pelli-choopulu": Coffee,
  "/me": UserCircle2,
  "/lagna-patrika": ScrollText,
  "/biodata": IdCard,
  "/muhurtham": CalendarDays,
  "/stories": BookOpen,
  "/vendors": Store,
  "/safety": ShieldCheck,
  "/verify": BadgeCheck,
};
const NavIcon = ({ href, className = "w-4 h-4" }: { href: string; className?: string }) => {
  const Icon = ICON_MAP[href] || Sparkles;
  return <Icon className={className} strokeWidth={2.25} aria-hidden="true" />;
};

/* Desktop pills — neat & clean single labels */
const NAV_MAIN: NavItem[] = [
  { href: "/", en: "Home", te: "హోమ్", icon: "🏠" },
  { href: "/matches", en: "Matches", te: "సంబంధాలు", icon: "💘" },
  { href: "/second-marriage", en: "Second Marriage", te: "పునర్వివాహం", icon: "💍" },
  { href: "/spotlight", en: "Spotlight", te: "ప్రత్యేక ప్రొఫైళ్లు", icon: "🌟" },
  { href: "/channels", en: "Channels", te: "ఛానళ్లు", icon: "📢" },
  // Keep common laptop widths uncluttered; these remain one tap away in the menu.
  { href: "/castes", en: "Communities", te: "కులాలు", icon: "🪔", xl: true },
  { href: "/pricing", en: "Pricing", te: "ధరలు", icon: "💰", xl: true },
  { href: "/referral", en: "Referral", te: "రెఫరల్", icon: "🤝", xl: true },
];

const NAV_EARN: NavItem[] = [
  { href: "/spotlight", en: "Promote Profile (Spotlight)", te: "ప్రొఫైల్ ప్రమోట్ (స్పాట్‌లైట్)", icon: "🌟" },
  { href: "/referral", en: "Referral dashboard", te: "రెఫరల్ డాష్‌బోర్డ్", icon: "🤝" },
  { href: "/referral/register", en: "Become a referrer", te: "రెఫరర్‌గా చేరండి", icon: "🎁" },
  { href: "/bureau", en: "Bureau (B2B)", te: "బ్యూరో (B2B)", icon: "🏛️" },
  { href: "/vendors/register", en: "List your business", te: "మీ business చేర్చండి", icon: "📝" },
];

const NAV_MORE: NavItem[] = [
  { href: "/second-marriage", en: "Second Marriage (Remarriage)", te: "పునర్వివాహం (Second Marriage)", icon: "💍" },
  { href: "/districts", en: "TS & AP Districts", te: "జిల్లా సమగ్ర సంబంధాలు", icon: "🏛️" },
  { href: "/compare", en: "Compare Profiles", te: "సంబంధాల పోలిక స్టూడియో", icon: "⚖️" },
  { href: "/pelli-choopulu", en: "Pelli Choopulu Guide", te: "పెళ్లి చూపుల గైడ్", icon: "☕" },
  { href: "/me", en: "My Account", te: "నా అకౌంట్", icon: "🙋" },
  { href: "/lagna-patrika", en: "Lagna Patrika Studio", te: "శుభ లగ్న పత్రిక స్టూడియో", icon: "📜" },
  { href: "/biodata", en: "Biodata Maker", te: "బయోడేటా మేకర్", icon: "🎴" },
  { href: "/muhurtham", en: "Muhurthams", te: "ముహూర్తాలు 2026-27", icon: "🗓️" },
  { href: "/stories", en: "Stories", te: "కథలు", icon: "💑" },
  { href: "/vendors", en: "Vendors", te: "వెండర్లు", icon: "🏪" },
  { href: "/safety", en: "Safety", te: "భద్రత", icon: "🛡️" },
  { href: "/verify", en: "Verify profile", te: "Profile verify", icon: "✅" },
];

// Keep the wide desktop header focused on the primary journeys. The remaining
// destinations stay available in this compact, keyboard-operable disclosure.
const NAV_DESKTOP_MORE: NavItem[] = [
  { href: "/castes", en: "Communities", te: "కులాలు", icon: "🪔" },
  { href: "/pricing", en: "Pricing & plans", te: "ధరలు", icon: "💰" },
  { href: "/referral", en: "Referral programme", te: "రెఫరల్", icon: "🤝" },
  ...NAV_MORE.filter((item) => !["/castes", "/pricing", "/referral"].includes(item.href)),
];

/* 🔒 Admin (/admin, /growth, /admin/photos) is DELIBERATELY not linked anywhere in public UI
   (anti-scam) — team opens it by direct URL + X-Admin-Key only. */

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang } = useLang();
  const te = lang === "te";
  const [open, setOpen] = useState(false);
  const [studiosOpen, setStudiosOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const studiosRef = useRef<HTMLDivElement>(null);
  const studiosButtonRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  // 🔐 WAVE 13 — show the persistent session chip only after server verification.
  const { tsapId, token, ready } = useSession();
  const [sessionVerification, setSessionVerification] = useState<{ token: string; valid: boolean } | null>(null);
  const [loggedOutToken, setLoggedOutToken] = useState("");
  useEffect(() => {
    if (!ready || !token) return;
    let active = true;
    apiGet<{ valid?: boolean }>("/api/auth/verify").then(({ ok, data }) => {
      if (!active) return;
      setSessionVerification({
        token,
        valid: !!(ok && (data as { valid?: boolean } | null)?.valid),
      });
    });
    return () => { active = false; };
  }, [ready, token]);
  const sessionOk = ready && !!token && token !== loggedOutToken &&
    sessionVerification?.token === token && sessionVerification.valid;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setOpen(false);
      setStudiosOpen(false);
      setMoreOpen(false);
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [pathname]);

  useEffect(() => {
    if (!open && !studiosOpen && !moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const active = document.activeElement;
      if (studiosOpen && studiosRef.current?.contains(active)) studiosButtonRef.current?.focus();
      else if (moreOpen && moreRef.current?.contains(active)) moreButtonRef.current?.focus();
      else if (open) mobileMenuButtonRef.current?.focus();
      setOpen(false);
      setStudiosOpen(false);
      setMoreOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, studiosOpen, moreOpen]);

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
      aria-current={isActive(n.href) ? "page" : undefined}
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
        isActive(n.href) ? "bg-maroon text-white shadow-soft" : "text-ink/80 hover:bg-white"
      }`}
    >
      <span className="w-6 flex items-center justify-center text-maroon/70">
        <NavIcon href={n.href} className="w-[18px] h-[18px]" />
      </span>
      <Duo en={n.en} te={n.te} />
      {isActive(n.href) && <span className="ml-auto text-[10px] opacity-80">●</span>}
    </Link>
  );

  return (
    <header
      className={`brand-header sticky top-0 z-50 no-print border-b transition-shadow duration-300 ${
        scrolled ? "border-gold/35 shadow-[0_8px_26px_rgba(74,12,34,.1)]" : "border-gold/20"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-4 h-16 lg:h-14 flex items-center justify-between gap-2">
        {/* One clean wordmark: the selected language controls every visible label. */}
        <Link href="/" className="flex items-center gap-2.5 min-w-0 flex-1 focus-brand rounded-xl" aria-label={te ? "మన వివాహ హోమ్" : "Mana Vivaha home"}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SITE_CONFIG.logoImage} alt="" width={44} height={44}
            className="w-10 h-10 lg:w-8 lg:h-8 rounded-xl lg:rounded-lg object-cover shadow-[0_5px_14px_rgba(122,12,46,.18)] ring-1 ring-maroon/10 shrink-0" />
          <div className="brand-lockup min-w-0">
            <div className="brand-name" aria-label="Mana Vivaha">
              <span className="brand-name-primary">Mana</span>{" "}
              <span className="brand-name-accent">Vivaha</span>
              <span className="brand-spark" aria-hidden="true">✦</span>
            </div>
            <div className="brand-name-telugu telugu" aria-label="మన వివాహ">
              <span className="brand-name-primary">మన</span>{" "}
              <span className="brand-name-accent">వివాహ</span>
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden xl:flex items-center gap-1" aria-label={te ? "ప్రధాన నావిగేషన్" : "Main navigation"}>
          {NAV_MAIN.filter((n) => ["/matches", "/second-marriage", "/spotlight", "/channels"].includes(n.href)).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={duo(n.en, n.te)}
              aria-current={isActive(n.href) ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 px-2.5 py-2 rounded-full whitespace-nowrap text-[12px] font-semibold transition ${
                isActive(n.href)
                  ? "bg-maroon text-white shadow-soft"
                  : "text-ink/75 hover:text-maroon hover:bg-maroon-soft"
              }`}
            >
              <NavIcon href={n.href} className={`w-[15px] h-[15px] ${isActive(n.href) ? "text-white" : "text-maroon/60"}`} />
              {te ? n.te : n.en}
            </Link>
          ))}

          {/* Studios Dropdown for Desktop */}
          <div
            ref={studiosRef}
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setStudiosOpen(false);
            }}
          >
            <button
              ref={studiosButtonRef}
              type="button"
              onClick={() => { setStudiosOpen((value) => !value); setMoreOpen(false); }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold text-ink/75 hover:text-maroon hover:bg-maroon-soft transition"
              aria-expanded={studiosOpen}
              aria-controls="desktop-studios-menu"
            >
              <Sparkles className="w-[15px] h-[15px] text-gold-deep" strokeWidth={2.25} aria-hidden="true" />
              <span>{te ? "స్టూడియోలు" : "Studios"}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${studiosOpen ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden="true" />
            </button>

            <div
              id="desktop-studios-menu"
              aria-hidden={!studiosOpen}
              inert={!studiosOpen}
              className={`absolute left-0 top-full mt-1.5 w-64 max-h-[min(75vh,36rem)] overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gold/30 p-2 transition-all duration-200 z-50 ${studiosOpen ? "visible opacity-100 translate-y-0" : "invisible pointer-events-none opacity-0 translate-y-2"}`}
            >
              <Link
                href="/lagna-patrika"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gold/10 text-xs font-bold text-gray-800 hover:text-maroon transition"
              >
                <ScrollText className="w-[18px] h-[18px] text-maroon/70 shrink-0" strokeWidth={2} aria-hidden="true" />
                <div>
                  <div>{te ? "శుభ లగ్న పత్రిక స్టూడియో" : "Lagna Patrika Studio"}</div>
                  <div className="text-[10px] font-normal text-gray-500">{te ? "4 రాయల్ థీమ్స్ • HD JPG" : "Royal Wedding Invitations"}</div>
                </div>
              </Link>
              <Link
                href="/compare"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gold/10 text-xs font-bold text-gray-800 hover:text-maroon transition"
              >
                <Scale className="w-[18px] h-[18px] text-maroon/70 shrink-0" strokeWidth={2} aria-hidden="true" />
                <div>
                  <div>{te ? "సంబంధాల పోలిక స్టూడియో" : "Profile Compare Matrix"}</div>
                  <div className="text-[10px] font-normal text-gray-500">{te ? "Side-by-Side 3 Profiles" : "Compare Astro & Income"}</div>
                </div>
              </Link>
              <Link
                href="/pelli-choopulu"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gold/10 text-xs font-bold text-gray-800 hover:text-maroon transition"
              >
                <Coffee className="w-[18px] h-[18px] text-maroon/70 shrink-0" strokeWidth={2} aria-hidden="true" />
                <div>
                  <div>{te ? "పెళ్లి చూపుల గైడ్" : "Pelli Choopulu Guide"}</div>
                  <div className="text-[10px] font-normal text-gray-500">{te ? "ఆచారాలు & పెద్దల చెక్‌లిస్ట్" : "Etiquette & 1-on-1 Questions"}</div>
                </div>
              </Link>
              <Link
                href="/biodata"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gold/10 text-xs font-bold text-gray-800 hover:text-maroon transition"
              >
                <IdCard className="w-[18px] h-[18px] text-maroon/70 shrink-0" strokeWidth={2} aria-hidden="true" />
                <div>
                  <div>{te ? "తెలుగు బయోడేటా మేకర్" : "Free Biodata Maker"}</div>
                  <div className="text-[10px] font-normal text-gray-500">{te ? "1 నిమిషంలో ఉచిత HD కార్డ్" : "Instant Wedding Biodata"}</div>
                </div>
              </Link>
              <Link
                href="/districts"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gold/10 text-xs font-bold text-gray-800 hover:text-maroon transition"
              >
                <MapPin className="w-[18px] h-[18px] text-maroon/70 shrink-0" strokeWidth={2} aria-hidden="true" />
                <div>
                  <div>{te ? "TS & AP జిల్లాలు" : "TS & AP Districts Hub"}</div>
                  <div className="text-[10px] font-normal text-gray-500">{te ? "స్థానిక ప్రాంతాల సంబంధాలు" : "District-wise Matching"}</div>
                </div>
              </Link>
              <Link
                href="/muhurtham"
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gold/10 text-xs font-bold text-gray-800 hover:text-maroon transition"
              >
                <CalendarDays className="w-[18px] h-[18px] text-maroon/70 shrink-0" strokeWidth={2} aria-hidden="true" />
                <div>
                  <div>{te ? "వివాహ ముహూర్తాలు 2026-27" : "Muhurtham Calendar"}</div>
                  <div className="text-[10px] font-normal text-gray-500">{te ? "తిథి, నక్షత్రం, లగ్న వివరాలు" : "Auspicious Wedding Dates"}</div>
                </div>
              </Link>
            </div>
          </div>

          <div
            ref={moreRef}
            className="relative"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMoreOpen(false);
            }}
          >
            <button
              ref={moreButtonRef}
              type="button"
              onClick={() => { setMoreOpen((value) => !value); setStudiosOpen(false); }}
              className={`inline-flex items-center gap-1 px-3 py-2 rounded-full text-[12px] font-semibold transition ${moreOpen ? "bg-maroon-soft text-maroon" : "text-ink/75 hover:text-maroon hover:bg-maroon-soft"}`}
              aria-expanded={moreOpen}
              aria-controls="desktop-more-menu"
            >
              <span>{te ? "మరిన్ని" : "More"}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <div
              id="desktop-more-menu"
              aria-hidden={!moreOpen}
              inert={!moreOpen}
              className={`absolute right-0 top-full mt-1.5 w-64 max-h-[min(75vh,36rem)] overflow-y-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gold/30 p-2 transition-all duration-200 z-50 ${moreOpen ? "visible opacity-100 translate-y-0" : "invisible pointer-events-none opacity-0 translate-y-2"}`}
            >
              {NAV_DESKTOP_MORE.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${isActive(item.href) ? "bg-maroon text-white" : "text-ink/80 hover:bg-gold/10 hover:text-maroon"}`}
                >
                  <span className="w-5 flex items-center justify-center shrink-0">
                    <NavIcon href={item.href} className="w-4 h-4" />
                  </span>
                  <Duo en={item.en} te={item.te} />
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden md:block"><LangToggle compact /></div>
          <div className="md:hidden">
            <LangToggle compact />
          </div>
          {ready && tsapId && sessionOk ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-full">
              <Link href="/me" className="inline-flex items-center gap-1.5 hover:underline">
                <UserCircle2 className="w-[15px] h-[15px]" strokeWidth={2.25} aria-hidden="true" />
                {tsapId.length > 14 ? `${tsapId.slice(0, 9)}…${tsapId.slice(-4)}` : tsapId}
              </Link>
              <button
                onClick={() => { logout(); setLoggedOutToken(token); router.replace("/"); }}
                className="ml-1 rounded-full bg-emerald-200 p-1 hover:bg-emerald-300 inline-flex items-center justify-center"
                aria-label="Logout"
              >
                <LogOut className="w-3 h-3" strokeWidth={2.5} aria-hidden="true" />
              </button>
            </span>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-bold border border-maroon/30 text-maroon rounded-full hover:bg-maroon-soft transition"
            >
              <Smartphone className="w-[15px] h-[15px]" strokeWidth={2.25} aria-hidden="true" /> {te ? "లాగిన్" : "Login"}
            </Link>
          )}
          <Link
            href="/register"
            className="hidden sm:inline-flex px-4 py-2 rounded-full text-[13px] font-black maroon-gradient text-white shadow-soft hover:shadow-brand transition whitespace-nowrap"
          >
            <span>{te ? "ఉచిత నమోదు" : "Free Register"}</span>
          </Link>
          <button
            aria-label={te ? "మెనూ" : "Menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            ref={mobileMenuButtonRef}
            className="xl:hidden w-10 h-10 rounded-xl border border-maroon/20 flex items-center justify-center text-maroon focus-brand"
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
      <nav
        id="mobile-menu"
        aria-label={te ? "మొబైల్ నావిగేషన్" : "Mobile navigation"}
        aria-hidden={!open}
        inert={!open}
        data-open={open}
        className="mobile-menu xl:hidden"
      >
        <div className="mobile-menu__panel glass border-t border-gold/25 px-4 pt-1 pb-4 overscroll-contain menu-scroll">
          {groupTitle("Main", "మెయిన్")}
          <div className="space-y-1">
            {NAV_MAIN.map(menuLink)}
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
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border border-maroon/25 text-maroon text-sm font-bold"
            >
              <Search className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
              <Duo en="Search matches" te="సంబంధాలు వెతకండి" />
            </Link>
            <a
              href={SITE_CONFIG.officialChannelUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl gold-gradient text-maroon text-sm font-bold"
            >
              <Megaphone className="w-4 h-4" strokeWidth={2.25} aria-hidden="true" />
              <Duo en="Telegram Channel" te="టెలిగ్రామ్ ఛానల్" />
            </a>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gold/25 pt-3">
            <Link
              href={sessionOk ? "/me" : "/login"}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-maroon/25 bg-white px-3 py-2.5 text-sm font-bold text-maroon"
            >
              {sessionOk ? <UserCircle2 className="h-4 w-4" aria-hidden="true" /> : <Smartphone className="h-4 w-4" aria-hidden="true" />}
              {sessionOk ? (te ? "నా అకౌంట్" : "My account") : (te ? "లాగిన్" : "Log in")}
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl maroon-gradient px-3 py-2.5 text-sm font-bold text-white"
            >
              {te ? "ఉచిత నమోదు" : "Register free"}
            </Link>
          </div>
          <div className="flex justify-center pt-3">
            <LangToggle />
          </div>
        </div>
      </nav>
    </header>
  );
}
