"use client";

/**
 * ✨ లగ్నAI (LagnaAI) — ULTRA ADVANCED MATRIMONIAL CONCIERGE & ASTRO ASSISTANT
 * Smart conversational assistant in Telugu & English that helps users find
 * perfect matches, understand Vedic 10-Porutham astrology, and navigate plans.
 */
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";

type Message = {
  id: string;
  sender: "ai" | "user";
  text: string;
  time: string;
  actions?: { label: string; href?: string; query?: Record<string, string> }[];
};

const ASTRO_KNOWLEDGE_BASE: Record<string, string> = {
  rohini: "రోహిణి నక్షత్రం (వృషభ రాశి - శుక్రుని అధిపత్యం): మృగశిర, పునర్వసు, హస్త, అనురాధ, ఉత్తరాభాద్ర నక్షత్రాలతో ఉత్తమ గణ మైత్రి మరియు రజ్జు శుద్ధి ఉంటుంది.",
  ashwini: "అశ్విని నక్షత్రం (మేష రాశి - కేతు అధిపత్యం): భరణి, రోహిణి, మృగశిర, పుష్యమి, ఉత్తర, స్వాతి నక్షత్రాలతో మంచి పొరుతం (8+/10) లభిస్తుంది.",
  mriga: "మృగశిర నక్షత్రం: రోహిణి, ఆర్ద్ర, పునర్వసు, హస్త, చిత్త, శ్రవణం నక్షత్రాలతో అద్భుతమైన దాంపత్య మైత్రి ఉంటుంది.",
  kuja: "కుజ దోషం (మంగళ దోషం): లగ్నం, 2, 4, 7, 8, 12 స్థానాల్లో కుజుడు ఉన్నప్పుడు వస్తుంది. ఎదుటి ప్రొఫైల్ కు కూడా కుజ దోషం ఉంటే దోష నివారణ జరిగి శుభప్రదం అవుతుంది.",
};

export default function LagnaAiAssistant() {
  const { lang } = useLang();
  const te = lang === "te";
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "ai",
      text: te
        ? "నమస్కారం! 🙏 నేను లగ్నAI (LagnaAI) మీ వ్యక్తిగత వివాహ సహాయకుడిని. మీకు తగిన సంబంధాలు వెతకడంలో, జాతక పొరుతం విశ్లేషణలో, లేదా సందేహాలు తీర్చడంలో సహాయపడతాను. ఏమి వెతకాలి?"
        : "Namaste! 🙏 I am LagnaAI, your personal Telugu matrimony & astrology concierge. I can help you discover verified matches, evaluate Vedic horoscopes, or assist with your search.",
      time: "Just now",
      actions: [
        { label: te ? "🔍 సాఫ్ట్‌వేర్ సంబంధాలు (హైదరాబాద్)" : "🔍 Software Matches (Hyd)", href: "/matches?job=Software&district=Hyderabad" },
        { label: te ? "🪐 జాతక పొరుతం లెక్కింపు" : "🪐 Kundli Matcher", href: "/porutham" },
        { label: te ? "💍 కులాల వారీగా ఛానల్స్" : "💍 Caste Hubs", href: "/castes" },
        { label: te ? "💰 ₹99 ప్యాకేజీ వివరాలు" : "💰 ₹99 Plan Info", href: "/pricing" },
      ],
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = async (userText?: string) => {
    const text = (userText || input).trim();
    if (!text) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!userText) setInput("");
    setIsTyping(true);

    // Simulate AI reasoning & matching
    setTimeout(() => {
      let replyText = "";
      let actions: { label: string; href?: string }[] = [];
      const lower = text.toLowerCase();

      if (lower.includes("software") || lower.includes("సాఫ్ట్‌వేర్") || lower.includes("it") || lower.includes("hyd") || lower.includes("హైదరాబాద్")) {
        replyText = te
          ? "హైదరాబాద్ & గ్లోబల్ NRI లొకేషన్లలో ఉన్న టాప్ సాఫ్ట్‌వేర్ ఇంజనీర్లు, టీమ్ లీడ్స్ & IT ప్రొఫెషనల్స్ సంబంధాలు సిద్ధంగా ఉన్నాయి! మొదటి 3 సంబంధాలు ఉచితంగా చూడవచ్చు."
          : "We have hundreds of verified Software Engineers and IT professionals in Hyderabad and NRI locations ready for you! First 3 profiles are completely FREE.";
        actions = [
          { label: te ? "🔍 హైదరాబాద్ సాఫ్ట్‌వేర్ సంబంధాలు →" : "View Hyderabad IT Matches →", href: "/matches?job=Software&district=Hyderabad" },
          { label: te ? "🌍 NRI సంబంధాలు చూడండి →" : "View NRI Matches →", href: "/matches?nri_only=true" },
        ];
      } else if (lower.includes("రోహిణి") || lower.includes("rohini") || lower.includes("నక్షత్రం") || lower.includes("star") || lower.includes("జాతకం") || lower.includes("కుజ") || lower.includes("dosham") || lower.includes("porutham")) {
        replyText = te
          ? "వేద జ్యోతిషం ప్రకారం 10-పొరుతం (దిన, గణ, మాహేంద్ర, స్త్రీదీర్ఘ, యోని, రాశి, రజ్జు, వేధ...) పరిశీలన చాలా ముఖ్యం. ముఖ్యంగా రజ్జు దోషం లేకుండా చూసుకోవడం శ్రేయస్కరం. మా ఉచిత టూల్‌తో తక్షణమే స్కోర్ చూసుకోండి."
          : "According to Vedic astrology, 10-Porutham Gunamilan (Rajju, Gana, Rasi, Yoni, Dina...) is essential for marital harmony. Check instant Vedic compatibility with our free tool.";
        actions = [
          { label: te ? "🪐 10-పొరుతం కాలిక్యులేటర్ తెరవండి →" : "Open 10-Porutham Calculator →", href: "/porutham" },
          { label: te ? "🕉️ పురోహితుల సంప్రదింపులు →" : "Consult Vedic Pandits →", href: "/vendors?category=pandit" },
        ];
      } else if (lower.includes("రెడ్డి") || lower.includes("reddy")) {
        replyText = te
          ? "రెడ్డి కమ్యూనిటీ వధువులు & వరుల కోసం ప్రత్యేక లైవ్ ఛానల్ మరియు 100% వెరిఫైడ్ సంబంధాల డైరెక్టరీ ఉంది."
          : "Dedicated Reddy Community matrimony hub with live verified bride & groom profiles across TS & AP.";
        actions = [
          { label: te ? "👰 రెడ్డి వధువులు చూడండి" : "Reddy Brides", href: "/castes/reddy-bride" },
          { label: te ? "🤵 రెడ్డి వరులు చూడండి" : "Reddy Grooms", href: "/castes/reddy-groom" },
        ];
      } else if (lower.includes("కమ్మ") || lower.includes("kamma") || lower.includes("చౌదరి")) {
        replyText = te
          ? "కమ్మ కమ్యూనిటీ వధువులు & వరుల ప్రత్యేక సంబంధాలు సిద్ధంగా ఉన్నాయి."
          : "Dedicated Kamma community matrimony portal with verified profiles across AP & TS.";
        actions = [
          { label: te ? "👰 కమ్మ సంబంధాలు చూడండి" : "Kamma Matches", href: "/castes/kamma-bride" },
        ];
      } else if (lower.includes("కాపు") || lower.includes("kapu") || lower.includes("బలిజ") || lower.includes("తెలగ")) {
        replyText = te
          ? "కాపు, బలిజ, తెలగ, ఒంటరి సమాజపు సంబంధాలు జిల్లాల వారీగా అందుబాటులో ఉన్నాయి."
          : "Kapu, Balija, Telaga matrimony portal with verified profiles across all districts.";
        actions = [
          { label: te ? "💍 కాపు సంబంధాలు చూడండి" : "Kapu Matches", href: "/castes/kapu-bride" },
        ];
      } else if (lower.includes("referral") || lower.includes("రిఫరల్") || lower.includes("డబ్బులు") || lower.includes("earning") || lower.includes("50")) {
        replyText = te
          ? "మా స్మార్ట్ రెఫరల్ ప్రోగ్రామ్‌లో చేరి ప్రతి చెల్లింపుపై ₹50 కమీషన్ పొందవచ్చు! స్నేహితుడు లింక్ ద్వారా రిజిస్టర్ అయి ఎప్పుడు ₹99 పే చేసినా మీ వాలెట్‌కు ₹50 జమ అవుతుంది (UPI ద్వారా విత్‌డ్రా చేసుకోవచ్చు)."
          : "Earn ₹50 commission per referral! When your referred friend pays ₹99 (even anytime later), ₹50 is instantly credited to your wallet with direct UPI withdrawal.";
        actions = [
          { label: te ? "🤝 రెఫరల్ కోడ్ పొందండి & సంపాదించండి →" : "Get Referral Link →", href: "/referral" },
        ];
      } else if (lower.includes("pricing") || lower.includes("ధర") || lower.includes("99") || lower.includes("ప్లాన్") || lower.includes("free")) {
        replyText = te
          ? "మన వివాహలో మొదటి 3 సంబంధాలు పూర్తిగా ఉచితం (100% FREE)! కేవలం ₹99 తో 5 సంబంధాల ఫోన్ నంబర్లు నేరుగా వాట్సాప్‌లో పొందవచ్చు. డిక్లైన్ అయితే క్రెడిట్ రీఫండ్ లభిస్తుంది."
          : "First 3 interest requests are 100% FREE. Get 5 direct verified contact unlocks for just ₹99 with full credit refund on decline!";
        actions = [
          { label: te ? "💰 ప్లాన్స్ & ధరలు చూడండి →" : "View Pricing Plans →", href: "/pricing" },
          { label: te ? "📝 ఉచిత నమోదు చేసుకోండి →" : "Register Free →", href: "/register" },
        ];
      } else {
        replyText = te
          ? `మీరు కోరిన "${text}" కి సంబంధించిన సంబంధాలను మా 100% వెరిఫైడ్ తెలుగు మ్యాట్రిమోనీ డేటాబేస్‌లో చూడవచ్చు. నేరుగా సంబంధాల సెర్చ్ లేదా ఉచిత రిజిస్ట్రేషన్ చేసుకోండి.`
          : `We found relevant matches for "${text}" in our verified matrimonial database. Explore matches directly or register for free.`;
        actions = [
          { label: te ? "🔍 సంబంధాలు చూడండి →" : "Explore Matches →", href: `/matches?q=${encodeURIComponent(text)}` },
          { label: te ? "📝 ఉచిత నమోదు →" : "Register Free →", href: "/register" },
        ];
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "ai",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        actions,
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 md:bottom-6 right-4 z-40 flex items-center gap-2 maroon-gradient text-white px-4 py-3 rounded-full shadow-2xl border-2 border-gold/70 hover:scale-105 active:scale-95 transition group"
          aria-label="Open LagnaAI Assistant"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-gold"></span>
          </span>
          <span className="text-base">✨</span>
          <span className="font-extrabold text-xs tracking-wide">
            {te ? "లగ్నAI అసిస్టెంట్" : "LagnaAI Concierge"}
          </span>
        </button>
      )}

      {/* Assistant Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-50 w-[92vw] max-w-[380px] h-[520px] bg-white rounded-3xl shadow-2xl border-2 border-gold/40 flex flex-col overflow-hidden animate-fade">
          {/* Header */}
          <div className="maroon-gradient text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-white/15 border border-gold/50 flex items-center justify-center text-lg shadow-inner">
                ✨
              </div>
              <div>
                <div className="font-extrabold text-sm flex items-center gap-1.5">
                  <span>లగ్నAI (LagnaAI)</span>
                  <span className="text-[9px] bg-emerald-500 text-white font-bold px-1.5 py-0.2 rounded-full">Online</span>
                </div>
                <p className="text-[10px] text-white/80">
                  {te ? "వేద జ్యోతిష & స్మార్ట్ సంబంధాల సహాయకుడు" : "Vedic Astro & Matrimony Concierge"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold transition"
            >
              ✕
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    m.sender === "user"
                      ? "bg-maroon text-white rounded-br-none"
                      : "bg-white text-slate-800 border border-gold/20 rounded-bl-none"
                  }`}
                >
                  <p>{m.text}</p>
                </div>

                {/* Quick Action Chips */}
                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[95%]">
                    {m.actions.map((act, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (act.href) {
                            setIsOpen(false);
                            router.push(act.href);
                          } else {
                            handleSend(act.label);
                          }
                        }}
                        className="bg-white hover:bg-amber-50 text-maroon border border-gold/40 text-[10.5px] font-bold px-2.5 py-1 rounded-xl shadow-xs hover:border-gold transition flex items-center gap-1"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.time}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 bg-white p-2.5 rounded-2xl border border-gold/20 w-16">
                <div className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-maroon rounded-full animate-bounce [animation-delay:0.4s]"></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              placeholder={te ? "ప్రశ్న అడగండి (ఉదా: సాఫ్ట్‌వేర్ సంబంధాలు, జాతకం...)" : "Ask question (e.g. software matches, kundli...)"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-maroon focus:bg-white focus:outline-none transition"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-9 h-9 rounded-xl maroon-gradient text-white flex items-center justify-center font-bold text-sm hover-lift disabled:opacity-40 shrink-0"
            >
              ➤
            </button>
          </form>
        </div>
      )}
    </>
  );
}
