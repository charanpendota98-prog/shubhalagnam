"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";

/** Mobile app navigation — Modern, Thumb-friendly, Top Matrimony App Standard. */
const ITEMS = [
  { href: "/", icon: "🏠", te: "హోమ్", en: "Home" },
  { href: "/matches", icon: "💘", te: "సంబంధాలు", en: "Matches" },
  { href: "/spotlight", icon: "🌟", te: "స్పాట్‌లైట్", en: "Spotlight" },
  { href: "/referral", icon: "🤝", te: "రెఫరల్", en: "Referral" },
  { href: "/me", icon: "👤", te: "నా అకౌంట్", en: "Account" },
] as const;

export default function StickyCTA() {
  const pathname = usePathname();
  const { lang } = useLang();
  if (pathname?.startsWith("/register")) return null;

  return (
    <nav className="mobile-bottom-nav no-print lg:hidden border-t border-gold/30 bg-white/95 backdrop-blur-md shadow-lg" aria-label={lang === "te" ? "మొబైల్ నావిగేషన్" : "Mobile navigation"}>
      <div className="mx-auto flex h-[62px] max-w-lg items-center justify-around px-2">
        {ITEMS.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all rounded-xl ${
                active ? "text-[#7A0C2E] font-extrabold scale-105" : "text-gray-500 hover:text-[#7A0C2E]"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span className="text-xl leading-none mb-0.5" aria-hidden="true">{item.icon}</span>
              <span className="text-[10px] tracking-tight truncate font-bold">
                {lang === "te" ? item.te : item.en}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
