"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";

/**
 * A quiet, shared workspace chrome for every route.
 *
 * Individual pages keep ownership of their content and loading/error states;
 * this frame supplies the common visual language that was previously missing
 * between public directories, member tools, and private workspaces. It is
 * intentionally compact so it never competes with a route's real heading.
 */
type RouteMeta = {
  zone: string;
  zoneTe: string;
  label: string;
  labelTe: string;
  icon: string;
  note: string;
  noteTe: string;
};

const DEFAULT_META: RouteMeta = {
  zone: "Mana Vivaha",
  zoneTe: "మన వివాహ",
  label: "Member workspace",
  labelTe: "సభ్యుల workspace",
  icon: "✦",
  note: "Clear information, respectful connections, and owner-controlled privacy.",
  noteTe: "స్పష్టమైన సమాచారం, గౌరవమైన పరిచయాలు, owner-controlled privacy.",
};

const ROUTES: Record<string, Partial<RouteMeta>> = {
  "/register": { zone: "Join", zoneTe: "చేరండి", label: "Create your profile", labelTe: "మీ ప్రొఫైల్ సృష్టించండి", icon: "✍️", note: "Your details stay in your hands; review before you publish.", noteTe: "మీ వివరాలు మీ నియంత్రణలోనే ఉంటాయి; publish చేసే ముందు review చేయండి." },
  "/login": { zone: "Account", zoneTe: "ఖాతా", label: "Secure sign in", labelTe: "సురక్షిత sign in", icon: "🔐", note: "Use your own account to manage requests and privacy.", noteTe: "మీ requests మరియు privacy నిర్వహించడానికి మీ account వాడండి." },
  "/matches": { zone: "Discover", zoneTe: "వెతకండి", label: "Advanced match search", labelTe: "Advanced match search", icon: "⌕", note: "Filters describe member-entered preferences; they are not compatibility scores.", noteTe: "Filters సభ్యులు నమోదు చేసిన preferences మాత్రమే; compatibility score కాదు." },
  "/search": { zone: "Discover", zoneTe: "వెతకండి", label: "Profile search", labelTe: "ప్రొఫైల్ శోధన", icon: "⌕", note: "Open a profile only with the real ID shared by its owner.", noteTe: "Owner share చేసిన నిజమైన ID తోనే profile తెరవండి." },
  "/second-marriage": { zone: "Discover", zoneTe: "వెతకండి", label: "Second-marriage community", labelTe: "రెండో వివాహ పరిచయాలు", icon: "🤝", note: "A respectful space for members with different life journeys.", noteTe: "వేర్వేరు జీవన ప్రయాణాలున్న సభ్యుల కోసం గౌరవమైన space." },
  "/spotlight": { zone: "Discover", zoneTe: "వెతకండి", label: "Member spotlight", labelTe: "సభ్యుల spotlight", icon: "✦", note: "Selected profiles appear only when real member data is available.", noteTe: "నిజమైన member data ఉన్నప్పుడే selected profiles కనిపిస్తాయి." },
  "/requests": { zone: "Connect", zoneTe: "పరిచయాలు", label: "Interest requests", labelTe: "ఆసక్తి అభ్యర్థనలు", icon: "💌", note: "Interest is not chatting; contact access follows owner acceptance.", noteTe: "Interest అంటే chatting కాదు; owner acceptance తర్వాతే contact access." },
  "/shortlist": { zone: "Connect", zoneTe: "పరిచయాలు", label: "Your shortlist", labelTe: "మీ shortlist", icon: "♡", note: "Save profiles privately and decide at your own pace.", noteTe: "Profiles ను private గా save చేసి మీ వేగంతో నిర్ణయించండి." },
  "/saved-searches": { zone: "Connect", zoneTe: "పరిచయాలు", label: "Saved searches", labelTe: "Saved searches", icon: "⌑", note: "Keep useful filters ready without inventing new matches.", noteTe: "ఉపయోగకరమైన filters ను save చేసుకోండి; కొత్త matches ఊహించము." },
  "/porutham": { zone: "Evidence", zoneTe: "ఆధారాలు", label: "Jathakam review", labelTe: "జాతక సమీక్ష", icon: "📜", note: "No star-only score, invented chart, or marriage verdict.", noteTe: "Star-only score, ఊహించిన chart లేదా వివాహ తీర్పు లేదు." },
  "/verify": { zone: "Trust", zoneTe: "నమ్మకం", label: "Review status", labelTe: "Review స్థితి", icon: "✓", note: "A review status describes one submitted item, not every profile claim.", noteTe: "Review స్థితి ఒక submitted item గురించి మాత్రమే; profile మొత్తం కాదు." },
  "/safety": { zone: "Trust", zoneTe: "నమ్మకం", label: "Safety centre", labelTe: "Safety centre", icon: "🛡️", note: "Pause, verify, report, and protect your personal information.", noteTe: "ఆగండి, verify చేయండి, report చేయండి, మీ personal information కాపాడండి." },
  "/privacy": { zone: "Trust", zoneTe: "నమ్మకం", label: "Privacy controls", labelTe: "Privacy controls", icon: "🔒", note: "Understand what is recorded and which controls you have.", noteTe: "ఏం record అవుతుందో, మీ controls ఏవో తెలుసుకోండి." },
  "/terms": { zone: "Trust", zoneTe: "నమ్మకం", label: "Terms & boundaries", labelTe: "Terms & boundaries", icon: "§", note: "Transparent boundaries make introductions safer for everyone.", noteTe: "స్పష్టమైన boundaries ప్రతి ఒక్కరికీ introductions ను safer చేస్తాయి." },
  "/refund": { zone: "Trust", zoneTe: "నమ్మకం", label: "Refund policy", labelTe: "Refund policy", icon: "₹", note: "Read the current credit and cancellation rules before paying.", noteTe: "చెల్లించే ముందు credit మరియు cancellation rules చదవండి." },
  "/biodata": { zone: "Studio", zoneTe: "Studio", label: "Biodata maker", labelTe: "బయోడేటా maker", icon: "▤", note: "Create a document from details you enter; this tool does not publish a profile.", noteTe: "మీరు ఇచ్చిన వివరాలతో document తయారు చేయండి; profile publish కాదు." },
  "/lagna-patrika": { zone: "Studio", zoneTe: "Studio", label: "Lagna Patrika studio", labelTe: "లగ్న పత్రిక studio", icon: "🪔", note: "Prepare a family invitation with the details you choose.", noteTe: "మీరు ఎంచుకున్న వివరాలతో కుటుంబ ఆహ్వానం తయారు చేయండి." },
  "/muhurtham": { zone: "Studio", zoneTe: "Studio", label: "Muhurtham guide", labelTe: "ముహూర్త guide", icon: "◷", note: "Indicative dates need confirmation from a local practitioner.", noteTe: "సూచనాత్మక తేదీలను స్థానిక నిపుణుడితో confirm చేయండి." },
  "/pelli-choopulu": { zone: "Studio", zoneTe: "Studio", label: "Family introduction guide", labelTe: "పెళ్లి చూపులు guide", icon: "☼", note: "Practical questions and safety guidance for family meetings.", noteTe: "కుటుంబ పరిచయాల కోసం practical questions మరియు safety guidance." },
  "/stories": { zone: "Community", zoneTe: "Community", label: "Member stories", labelTe: "సభ్యుల కథలు", icon: "✺", note: "Stories appear after review when authentic submissions are available.", noteTe: "Authentic submissions review తర్వాతే కనిపిస్తాయి." },
  "/castes": { zone: "Community", zoneTe: "Community", label: "Community directory", labelTe: "సంఘాల directory", icon: "◎", note: "Browse community pages without treating them as endorsements or outcomes.", noteTe: "Community pages ను endorsements లేదా outcomes గా భావించవద్దు." },
  "/districts": { zone: "Community", zoneTe: "Community", label: "District directory", labelTe: "జిల్లాల directory", icon: "⌖", note: "Explore member-submitted profiles by place when available.", noteTe: "లభ్యమైనప్పుడు ప్రాంతం ప్రకారం member-submitted profiles చూడండి." },
  "/channels": { zone: "Community", zoneTe: "Community", label: "Community channels", labelTe: "Community channels", icon: "◉", note: "Channel availability is shown honestly; delivery is never assumed.", noteTe: "Channel availability ను నిజాయితీగా చూపిస్తాం; delivery ఊహించము." },
  "/vendors": { zone: "Wedding services", zoneTe: "వివాహ services", label: "Wedding vendors", labelTe: "వివాహ vendors", icon: "⌂", note: "Service listings are separate from member verification and match outcomes.", noteTe: "Service listings member verification మరియు match outcomes కు వేరు." },
  "/pricing": { zone: "Plans", zoneTe: "Plans", label: "Plans & credits", labelTe: "Plans & credits", icon: "₹", note: "Review the current price, credit, and owner-acceptance rules.", noteTe: "Current price, credit మరియు owner-acceptance rules చూడండి." },
  "/referral": { zone: "Community", zoneTe: "Community", label: "Referral studio", labelTe: "Referral studio", icon: "↗", note: "Share responsibly; never promise a match or invent a member.", noteTe: "బాధ్యతగా share చేయండి; match హామీ ఇవ్వవద్దు." },
};

function routeKey(pathname: string): string {
  if (pathname === "/") return "/";
  const first = `/${pathname.split("/").filter(Boolean)[0] || ""}`;
  return first || "/";
}

export default function RouteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { lang } = useLang();
  const te = lang === "te";
  const key = routeKey(pathname);
  const meta = { ...DEFAULT_META, ...(ROUTES[key] || {}) } as RouteMeta;
  const isHome = key === "/";
  const isPrivate = ["/admin", "/control", "/owner", "/growth"].includes(key);

  return (
    <div className="route-frame" data-route={key.slice(1) || "home"} data-private={isPrivate ? "true" : "false"}>
      {!isHome && (
        <aside className="route-context" aria-label={te ? "పేజీ context" : "Page context"}>
          <div className="route-context__inner">
            <span className="route-context__icon" aria-hidden="true">{meta.icon}</span>
            <span className="route-context__zone">{te ? meta.zoneTe : meta.zone}</span>
            <span className="route-context__slash" aria-hidden="true">/</span>
            <span className="route-context__label">{te ? meta.labelTe : meta.label}</span>
            <span className="route-context__note">{te ? meta.noteTe : meta.note}</span>
            <span className="route-context__live"><i aria-hidden="true" />{te ? "ఈ పేజీ" : "This page"}</span>
          </div>
        </aside>
      )}
      <div className="route-frame__content">{children}</div>
    </div>
  );
}
