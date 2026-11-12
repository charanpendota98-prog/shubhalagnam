"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";
import RouteIntro from "@/components/RouteIntro";

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
  /** Opening headline of the route's cinematic intro band. */
  headline?: string;
  headlineTe?: string;
  /** One honest sentence under it. */
  lead?: string;
  leadTe?: string;
  /** `compact` keeps tool pages' own headings dominant. */
  intro?: "hero" | "compact" | "none";
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
  "/blog": { zone: "Reading", zoneTe: "చదవండి", label: "Notes", labelTe: "నోట్స్", icon: "✎", note: "Practical writing for Telugu families.", noteTe: "తెలుగు కుటుంబాలకు ఉపయోగకరమైన రచనలు.", headline: "Notes for Telugu families", headlineTe: 'తెలుగు కుటుంబాలకు నోట్స్', lead: 'Practical writing on matrimony, privacy and family conversations — no promises, no fake success stories.', leadTe: 'వివాహం, privacy, కుటుంబ సంభాషణలపై ఉపయోగకరమైన రచనలు — హామీలు లేవు, నకిలీ కథలు లేవు.', intro: "hero" },
  "/offline": { zone: "Offline", zoneTe: "Offline", label: "You are offline", labelTe: "మీరు offline లో ఉన్నారు", icon: "⚡", note: "The network is unreachable.", noteTe: "నెట్‌వర్క్ అందుబాటులో లేదు.", intro: "none" },
  "/register": { zone: "Join", zoneTe: "చేరండి", label: "Create your profile", labelTe: "మీ ప్రొఫైల్ సృష్టించండి", icon: "✍️", note: "Your details stay in your hands; review before you publish.", noteTe: "మీ వివరాలు మీ నియంత్రణలోనే ఉంటాయి; publish చేసే ముందు review చేయండి.", headline: "Create your profile", headlineTe: 'మీ ప్రొఫైల్ సృష్టించండి', lead: 'Your details stay in your hands. Nothing is published until you review it, and the first 3 interest requests are free.', leadTe: 'మీ వివరాలు మీ నియంత్రణలోనే. Review చేసే వరకు ఏదీ publish కాదు; మొదటి 3 interest requests ఉచితం.', intro: "none" },
  "/login": { zone: "Account", zoneTe: "ఖాతా", label: "Secure sign in", labelTe: "సురక్షిత sign in", icon: "🔐", note: "Use your own account to manage requests and privacy.", noteTe: "మీ requests మరియు privacy నిర్వహించడానికి మీ account వాడండి.", headline: "Sign in to your account", headlineTe: 'మీ ఖాతాలోకి sign in', lead: 'Phone number and password. Phone OTP is currently unavailable in this deployment; password recovery runs through a verified email address.', leadTe: 'ఫోన్ నంబర్ మరియు password. ఈ deployment లో phone OTP ప్రస్తుతం అందుబాటులో లేదు; password recovery నిర్ధారించిన email ద్వారా జరుగుతుంది.', intro: "none" },
  "/matches": { zone: "Discover", zoneTe: "వెతకండి", label: "Advanced match search", labelTe: "Advanced match search", icon: "⌕", note: "Filters describe member-entered preferences; they are not compatibility scores.", noteTe: "Filters సభ్యులు నమోదు చేసిన preferences మాత్రమే; compatibility score కాదు.", headline: "Find the profiles worth your time", headlineTe: 'మీ సమయానికి తగిన ప్రొఫైల్స్', lead: 'Filters describe what members entered themselves. They are not compatibility scores, and no profile is ranked by an invented promise.', leadTe: 'Filters సభ్యులు తామే నమోదు చేసిన వివరాలను మాత్రమే వివరిస్తాయి. అవి compatibility scores కావు.', intro: "none" },
  "/search": { zone: "Discover", zoneTe: "వెతకండి", label: "Profile search", labelTe: "ప్రొఫైల్ శోధన", icon: "⌕", note: "Open a profile only with the real ID shared by its owner.", noteTe: "Owner share చేసిన నిజమైన ID తోనే profile తెరవండి.", headline: "Open a profile by its real ID", headlineTe: 'నిజమైన ID తో ప్రొఫైల్ తెరవండి', lead: 'Profiles open only with the ID its owner shared. Contact details appear after the owner accepts your interest.', leadTe: 'Owner share చేసిన ID తోనే ప్రొఫైల్ తెరుచుకుంటుంది. Owner accept చేసిన తర్వాతే contact details.', intro: "none" },
  "/second-marriage": { zone: "Discover", zoneTe: "వెతకండి", label: "Second-marriage community", labelTe: "రెండో వివాహ పరిచయాలు", icon: "🤝", note: "A respectful space for members with different life journeys.", noteTe: "వేర్వేరు జీవన ప్రయాణాలున్న సభ్యుల కోసం గౌరవమైన space.", headline: "A respectful second beginning", headlineTe: 'గౌరవమైన రెండో ప్రారంభం', lead: 'A space for members whose life journey took a different path. Details are member-submitted; verify them yourself.', leadTe: 'వేరే జీవన ప్రయాణం ఉన్న సభ్యుల కోసం. వివరాలు సభ్యులు ఇచ్చినవి; స్వయంగా నిర్ధారించుకోండి.', intro: "none" },
  "/spotlight": { zone: "Discover", zoneTe: "వెతకండి", label: "Member spotlight", labelTe: "సభ్యుల spotlight", icon: "✦", note: "Selected profiles appear only when real member data is available.", noteTe: "నిజమైన member data ఉన్నప్పుడే selected profiles కనిపిస్తాయి.", headline: "Member spotlight", headlineTe: 'సభ్యుల spotlight', lead: 'Selected profiles appear only when real member data is available. No invented highlights.', leadTe: 'నిజమైన member data ఉన్నప్పుడే selected profiles కనిపిస్తాయి.', intro: "none" },
  "/requests": { zone: "Connect", zoneTe: "పరిచయాలు", label: "Interest requests", labelTe: "ఆసక్తి అభ్యర్థనలు", icon: "💌", note: "Interest is not chatting; contact access follows owner acceptance.", noteTe: "Interest అంటే chatting కాదు; owner acceptance తర్వాతే contact access.", headline: "Interest requests", headlineTe: 'ఆసక్తి అభ్యర్థనలు', lead: 'An interest is not a chat. Contact details unlock only when the profile owner accepts.', leadTe: 'Interest అంటే chatting కాదు. Owner accept చేసినప్పుడే contact details.', intro: "none" },
  "/shortlist": { zone: "Connect", zoneTe: "పరిచయాలు", label: "Your shortlist", labelTe: "మీ shortlist", icon: "♡", note: "Save profiles privately and decide at your own pace.", noteTe: "Profiles ను private గా save చేసి మీ వేగంతో నిర్ణయించండి.", headline: "Your shortlist", headlineTe: 'మీ shortlist', lead: 'Save profiles privately and decide at your own pace. Nobody is told that you saved them.', leadTe: 'Profiles ను private గా save చేసి మీ వేగంతో నిర్ణయించుకోండి.', intro: "hero" },
  "/saved-searches": { zone: "Connect", zoneTe: "పరిచయాలు", label: "Saved searches", labelTe: "Saved searches", icon: "⌑", note: "Keep useful filters ready without inventing new matches.", noteTe: "ఉపయోగకరమైన filters ను save చేసుకోండి; కొత్త matches ఊహించము.", headline: "Saved searches", headlineTe: 'Saved searches', lead: 'Keep the filters that work for you. Saved searches never invent new matches.', leadTe: 'ఉపయోగకరమైన filters ను save చేసుకోండి; కొత్త matches ఊహించము.', intro: "compact" },
  "/porutham": { zone: "Evidence", zoneTe: "ఆధారాలు", label: "Jathakam review", labelTe: "జాతక సమీక్ష", icon: "📜", note: "No star-only score, invented chart, or marriage verdict.", noteTe: "Star-only score, ఊహించిన chart లేదా వివాహ తీర్పు లేదు.", headline: "Jathakam review, without a verdict", headlineTe: 'తీర్పు లేని జాతక సమీక్ష', lead: 'Read what the two charts say and what they do not. No star-only score, no invented chart, no marriage prediction.', leadTe: 'రెండు జాతకాలు ఏం చెబుతాయో, ఏం చెప్పవో తెలుసుకోండి. Star-only score లేదా వివాహ తీర్పు లేదు.', intro: "none" },
  "/verify": { zone: "Trust", zoneTe: "నమ్మకం", label: "Review status", labelTe: "Review స్థితి", icon: "✓", note: "A review status describes one submitted item, not every profile claim.", noteTe: "Review స్థితి ఒక submitted item గురించి మాత్రమే; profile మొత్తం కాదు.", headline: "Review status", headlineTe: 'Review స్థితి', lead: 'A review status describes one item that was submitted and checked. It is not a statement about every profile claim.', leadTe: 'Review స్థితి submit చేసి పరిశీలించిన ఒక item గురించి మాత్రమే.', intro: "none" },
  "/safety": { zone: "Trust", zoneTe: "నమ్మకం", label: "Safety centre", labelTe: "Safety centre", icon: "🛡️", note: "Pause, verify, report, and protect your personal information.", noteTe: "ఆగండి, verify చేయండి, report చేయండి, మీ personal information కాపాడండి.", headline: "Safety centre", headlineTe: 'Safety centre', lead: 'Pause, verify, report, block. Advance-money requests are fraud — report them here.', leadTe: 'ఆగండి, verify చేయండి, report చేయండి, block చేయండి. Advance money అడిగితే అది మోసం — ఇక్కడ report చేయండి.', intro: "none" },
  "/privacy": { zone: "Trust", zoneTe: "నమ్మకం", label: "Privacy controls", labelTe: "Privacy controls", icon: "🔒", note: "Understand what is recorded and which controls you have.", noteTe: "ఏం record అవుతుందో, మీ controls ఏవో తెలుసుకోండి.", headline: "Privacy controls", headlineTe: 'Privacy controls', lead: 'See exactly what is recorded, what other members can see, and which switches are yours.', leadTe: 'ఏం record అవుతుందో, ఇతర సభ్యులు ఏం చూడగలరో, ఏ switches మీవో ఇక్కడ స్పష్టంగా చూడండి.', intro: "hero" },
  "/terms": { zone: "Trust", zoneTe: "నమ్మకం", label: "Terms & boundaries", labelTe: "Terms & boundaries", icon: "§", note: "Transparent boundaries make introductions safer for everyone.", noteTe: "స్పష్టమైన boundaries ప్రతి ఒక్కరికీ introductions ను safer చేస్తాయి.", headline: "Terms and boundaries", headlineTe: 'నిబంధనలు మరియు హద్దులు', lead: 'Clear boundaries make introductions safer for everyone. Please read these before you send an interest.', leadTe: 'స్పష్టమైన హద్దులు అందరికీ introductions ను safer చేస్తాయి.', intro: "hero" },
  "/refund": { zone: "Trust", zoneTe: "నమ్మకం", label: "Refund policy", labelTe: "Refund policy", icon: "₹", note: "Read the current credit and cancellation rules before paying.", noteTe: "చెల్లించే ముందు credit మరియు cancellation rules చదవండి.", headline: "Refund policy", headlineTe: 'వాపసు విధానం', lead: 'Read the current credit and cancellation rules before you pay. Credits are not cash refunds.', leadTe: 'చెల్లించే ముందు credit మరియు cancellation rules చదవండి. Credits cash refunds కావు.', intro: "hero" },
  "/biodata": { zone: "Studio", zoneTe: "Studio", label: "Biodata maker", labelTe: "బయోడేటా maker", icon: "▤", note: "Create a document from details you enter; this tool does not publish a profile.", noteTe: "మీరు ఇచ్చిన వివరాలతో document తయారు చేయండి; profile publish కాదు.", headline: "Biodata maker", headlineTe: 'బయోడేటా maker', lead: 'Build a document from details you type. This tool never publishes a profile on its own.', leadTe: 'మీరు టైప్ చేసిన వివరాలతో document తయారు చేయండి. ఇది స్వంతంగా profile publish చేయదు.', intro: "none" },
  "/lagna-patrika": { zone: "Studio", zoneTe: "Studio", label: "Lagna Patrika studio", labelTe: "లగ్న పత్రిక studio", icon: "🪔", note: "Prepare a family invitation with the details you choose.", noteTe: "మీరు ఎంచుకున్న వివరాలతో కుటుంబ ఆహ్వానం తయారు చేయండి.", headline: "Lagna Patrika studio", headlineTe: 'లగ్న పత్రిక studio', lead: 'Prepare a family invitation with your own details, your own wording, and your own order.', leadTe: 'మీ వివరాలతో, మీ మాటలతో కుటుంబ ఆహ్వానం తయారు చేసుకోండి.', intro: "none" },
  "/muhurtham": { zone: "Studio", zoneTe: "Studio", label: "Muhurtham guide", labelTe: "ముహూర్త guide", icon: "◷", note: "Indicative dates need confirmation from a local practitioner.", noteTe: "సూచనాత్మక తేదీలను స్థానిక నిపుణుడితో confirm చేయండి.", headline: "Muhurtham guide", headlineTe: 'ముహూర్త guide', lead: 'Indicative dates need confirmation from a local practitioner. Nothing here is an auspiciousness guarantee.', leadTe: 'సూచనాత్మక తేదీలను స్థానిక నిపుణుడితో నిర్ధారించుకోండి. ఇది శుభత్వ హామీ కాదు.', intro: "none" },
  "/pelli-choopulu": { zone: "Studio", zoneTe: "Studio", label: "Family introduction guide", labelTe: "పెళ్లి చూపులు guide", icon: "☼", note: "Practical questions and safety guidance for family meetings.", noteTe: "కుటుంబ పరిచయాల కోసం practical questions మరియు safety guidance.", headline: "Pelli choopulu guide", headlineTe: 'పెళ్లి చూపులు guide', lead: 'Practical questions for the first family meeting, plus the safety steps worth agreeing on beforehand.', leadTe: 'మొదటి కుటుంబ పరిచయానికి practical ప్రశ్నలు, ముందే అంగీకరించాల్సిన safety చర్యలు.', intro: "none" },
  "/stories": { zone: "Community", zoneTe: "Community", label: "Member stories", labelTe: "సభ్యుల కథలు", icon: "✺", note: "Stories appear after review when authentic submissions are available.", noteTe: "Authentic submissions review తర్వాతే కనిపిస్తాయి.", headline: "Member stories", headlineTe: 'సభ్యుల కథలు', lead: 'Stories appear after review, and only when members have submitted their own. Nothing is written for them.', leadTe: 'సభ్యులు తామే submit చేసిన కథలు review తర్వాతే కనిపిస్తాయి.', intro: "none" },
  "/castes": { zone: "Community", zoneTe: "Community", label: "Community directory", labelTe: "సంఘాల directory", icon: "◎", note: "Browse community pages without treating them as endorsements or outcomes.", noteTe: "Community pages ను endorsements లేదా outcomes గా భావించవద్దు.", headline: "Community directory", headlineTe: 'సంఘాల directory', lead: 'Browse community pages without reading them as endorsements or outcomes.', leadTe: 'Community pages ను endorsements లేదా outcomes గా భావించవద్దు.', intro: "none" },
  "/districts": { zone: "Community", zoneTe: "Community", label: "District directory", labelTe: "జిల్లాల directory", icon: "⌖", note: "Explore member-submitted profiles by place when available.", noteTe: "లభ్యమైనప్పుడు ప్రాంతం ప్రకారం member-submitted profiles చూడండి.", headline: "District directory", headlineTe: 'జిల్లాల directory', lead: 'Explore member-submitted profiles by place when they are available.', leadTe: 'లభ్యమైనప్పుడు ప్రాంతం ప్రకారం member-submitted profiles చూడండి.', intro: "none" },
  "/channels": { zone: "Community", zoneTe: "Community", label: "Community channels", labelTe: "Community channels", icon: "◉", note: "Channel availability is shown honestly; delivery is never assumed.", noteTe: "Channel availability ను నిజాయితీగా చూపిస్తాం; delivery ఊహించము.", headline: "Community channels", headlineTe: 'Community channels', lead: 'Channel availability is shown honestly. Delivery is never assumed.', leadTe: 'Channel availability ను నిజాయితీగా చూపిస్తాం; delivery ఊహించము.', intro: "none" },
  "/vendors": { zone: "Wedding services", zoneTe: "వివాహ services", label: "Wedding vendors", labelTe: "వివాహ vendors", icon: "⌂", note: "Service listings are separate from member verification and match outcomes.", noteTe: "Service listings member verification మరియు match outcomes కు వేరు.", headline: "Wedding vendors", headlineTe: 'వివాహ vendors', lead: 'Book the people who make the day. Service listings are separate from member verification and match outcomes.', leadTe: 'వివాహాన్ని నిర్వహించే వారిని ఎంచుకోండి. Service listings member verification కు వేరు.', intro: "none" },
  "/pricing": { zone: "Plans", zoneTe: "Plans", label: "Plans & credits", labelTe: "Plans & credits", icon: "₹", note: "Review the current price, credit, and owner-acceptance rules.", noteTe: "Current price, credit మరియు owner-acceptance rules చూడండి.", headline: "Plans and pricing", headlineTe: 'ప్లాన్లు & ధరలు', lead: 'First 3 interest requests free. Paid plans start at ₹99; contact access always follows owner acceptance.', leadTe: 'మొదటి 3 interest requests ఉచితం. Paid plans ₹99 నుంచి; contact access ఎప్పుడూ owner acceptance తర్వాతే.', intro: "hero" },
  "/referral": { zone: "Community", zoneTe: "Community", label: "Referral studio", labelTe: "Referral studio", icon: "↗", note: "Share responsibly; never promise a match or invent a member.", noteTe: "బాధ్యతగా share చేయండి; match హామీ ఇవ్వవద్దు.", headline: "Referral studio", headlineTe: 'Referral studio', lead: 'Share responsibly. Nobody can promise a match, and no member is ever invented to make a referral look good.', leadTe: 'బాధ్యతగా share చేయండి. Match హామీ ఇవ్వలేము; ఎవరూ ఊహించిన సభ్యులు లేరు.', intro: "none" },
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
      {!isHome && meta.intro !== "none" && Boolean(meta.headline) && (
        <RouteIntro
          eyebrow={te ? meta.zoneTe : meta.zone}
          title={(te ? meta.headlineTe : meta.headline) || meta.headline || ""}
          lead={te ? meta.leadTe || meta.lead : meta.lead}
          telugu={te}
          glyph={meta.icon}
          size={meta.intro === "compact" ? "compact" : "hero"}
        />
      )}
      {!isHome && (meta.intro === "none" || !meta.headline) && (
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
