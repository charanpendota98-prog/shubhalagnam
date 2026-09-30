"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";

interface RemarriageCard {
  id: string;
  name: string;
  age: number;
  gender: "Bride" | "Groom";
  status: string;
  statusLabel: string;
  statusBg: string;
  children: string;
  caste: string;
  job: string;
  salary: string;
  location: string;
  star: string;
  photo: string;
  about: string;
}

const FEATURED_REMARRIAGE: RemarriageCard[] = [
  {
    id: "MV2001",
    name: "Sowmya Reddy",
    age: 30,
    gender: "Bride",
    status: "Divorced",
    statusLabel: "🕊️ విడాకులు (Divorced)",
    statusBg: "bg-rose-50 text-rose-800 border-rose-200",
    children: "పిల్లలు లేరు (No Children)",
    caste: "Reddy (Motati)",
    job: "Senior Software Engineer (TCS)",
    salary: "₹18.5L",
    location: "Hyderabad / Nalgonda",
    star: "Uttara Phalguni",
    photo: "/promo/bride-card.jpg",
    about: "IT లో స్థిరపడ్డాను. లీగల్ డివోర్స్ పూర్తయింది. పరస్పర గౌరవం, బాధ్యత గల మంచి తోడు కోసం చూస్తున్నాం.",
  },
  {
    id: "MV2002",
    name: "Rajesh Kamma",
    age: 33,
    gender: "Groom",
    status: "Divorced",
    statusLabel: "🕊️ విడాకులు (Divorced)",
    statusBg: "bg-rose-50 text-rose-800 border-rose-200",
    children: "1 బాబు (Mother Custody)",
    caste: "Kamma (Chowdary)",
    job: "Staff Software Architect (Microsoft)",
    salary: "₹32L",
    location: "Hyderabad / Vijayawada",
    star: "Swati",
    photo: "/promo/groom-kamma.jpg",
    about: "Microsoft లో ఆర్కిటెక్ట్. లీగల్ డివోర్స్ ఆర్డర్ ఉంది. నమ్మకంతో కొత్త జీవితాన్ని ప్రారంభించే తోడు కావాలి.",
  },
  {
    id: "MV2003",
    name: "Dr. Madhavi Varma",
    age: 32,
    gender: "Bride",
    status: "Widow",
    statusLabel: "🕊️ వితంతువు (Widow)",
    statusBg: "bg-purple-50 text-purple-800 border-purple-200",
    children: "1 పాప (5 yrs)",
    caste: "Raju (Kshatriya)",
    job: "Consultant Pediatrician (Apollo)",
    salary: "₹24L",
    location: "Visakhapatnam",
    star: "Rohini",
    photo: "/promo/bride-kapu.jpg",
    about: "అపోలోలో పీడియాట్రీషియన్. పాపను సొంత బిడ్డలా ఆదరించే, సంస్కారవంతమైన జీవిత భాగస్వామి కోసం చూస్తున్నాం.",
  },
  {
    id: "MV2004",
    name: "Sudhakar Rao Velama",
    age: 36,
    gender: "Groom",
    status: "Widower",
    statusLabel: "🕊️ విధురుడు (Widower)",
    statusBg: "bg-purple-50 text-purple-800 border-purple-200",
    children: "1 బాబు (7 yrs)",
    caste: "Velama (Padmanayaka)",
    job: "Executive Engineer (Irrigation Govt)",
    salary: "₹16L",
    location: "Warangal",
    star: "Punarvasu",
    photo: "/promo/groom-vysya.jpg",
    about: "తెలంగాణ ప్రభుత్వ గెజిటెడ్ ఆఫీసర్. 7 ఏళ్ల బాబు ఉన్నాడు. కుటుంబాన్ని ప్రేమగా చూసుకునే తోడు కావాలి.",
  },
];

export default function HomeSecondMarriageSection() {
  const { lang } = useLang();
  const te = lang === "te";

  return (
    <section className="max-w-7xl mx-auto px-4 py-8">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2D0A16] via-[#4A0C22] to-[#630E2E] text-white p-6 sm:p-8 md:p-10 border-2 border-gold/40 card-shadow-lg space-y-6">
        {/* Glow effect */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/15 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold/20 border border-gold/40 text-amber-200 text-xs font-black tracking-wide uppercase">
              <span>💍</span>
              <span>{te ? "పునర్వివాహ ప్రత్యేక విభాగం" : "SECOND MARRIAGE & REMARRIAGE PORTAL"}</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight telugu">
              {te ? (
                <>
                  మరుజన్మ వంటి కొత్త జీవితానికి... <span className="text-amber-300">గౌరవప్రదమైన నాంది</span>
                </>
              ) : (
                <>
                  Dignified Second Chapter... <span className="text-amber-300">Safe & Respectful Remarriage</span>
                </>
              )}
            </h2>

            <p className="text-xs sm:text-sm text-rose-100/90 max-w-2xl font-medium leading-relaxed">
              {te
                ? "విడాకులు పొందినవారు (Divorced) మరియు వితంతువుల (Widowed) కోసం 100% గోప్యత, లీగల్ ట్రాన్స్‌పరెన్సీ మరియు గౌరవంతో కూడిన ప్రత్యేక సంబంధాలు."
                : "Dedicated, private and verified remarriage matchmaking for Divorced, Widowed & Remarriage seekers across AP, TS & NRI Telugu families."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/second-marriage"
              className="px-5 py-2.5 rounded-2xl gold-gradient text-maroon font-black text-xs sm:text-sm shadow-md hover-lift flex items-center gap-1.5"
            >
              <span>💍</span>
              <span>{te ? "పునర్వివాహ సంబంధాలు చూడండి" : "Explore Remarriage Matches"}</span>
              <span>→</span>
            </Link>

            <Link
              href="/biodata?remarriage=true"
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs sm:text-sm transition"
            >
              🎴 {te ? "పునర్వివాహ బయోడేటా" : "Remarriage Biodata"}
            </Link>
          </div>
        </div>

        {/* 4 Trust Pillars */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-2.5">
            <span className="text-xl">🔒</span>
            <div>
              <div className="text-xs font-black text-amber-200">{te ? "100% ప్రైవసీ లాక్" : "100% Privacy Lock"}</div>
              <div className="text-[10.5px] text-rose-100">{te ? "నంబర్ & ఫోటో భద్రత" : "Protected Contacts"}</div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-2.5">
            <span className="text-xl">⚖️</span>
            <div>
              <div className="text-xs font-black text-amber-200">{te ? "లీగల్ స్పష్టత" : "Legal Decree Clarity"}</div>
              <div className="text-[10.5px] text-rose-100">{te ? "డివోర్స్ స్టేటస్ క్లారిటీ" : "Verified Separation"}</div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-2.5">
            <span className="text-xl">👶</span>
            <div>
              <div className="text-xs font-black text-amber-200">{te ? "పిల్లల సంరక్షణ" : "Child Welfare Transparency"}</div>
              <div className="text-[10.5px] text-rose-100">{te ? "కస్టడీ పూర్తి వివరాలు" : "Clear Custody Details"}</div>
            </div>
          </div>

          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex items-center gap-2.5">
            <span className="text-xl">👩‍💼</span>
            <div>
              <div className="text-xs font-black text-amber-200">{te ? "సీనియర్ కౌన్సెలర్" : "Senior Counselor Support"}</div>
              <div className="text-[10.5px] text-rose-100">{te ? "+91 63049 96088" : "+91 63049 96088"}</div>
            </div>
          </div>
        </div>

        {/* Featured Profiles Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURED_REMARRIAGE.map((p) => (
            <div
              key={p.id}
              className="bg-white text-slate-900 rounded-2xl p-4 border border-gold/40 shadow-lg flex flex-col justify-between space-y-3 hover:-translate-y-1 transition duration-200"
            >
              <div className="space-y-2.5">
                {/* Remarriage Status Badge */}
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${p.statusBg}`}>
                    {p.statusLabel}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-slate-400">{p.id}</span>
                </div>

                {/* Photo & Name */}
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.photo}
                    alt={p.name}
                    className="w-14 h-16 rounded-xl object-cover border border-gold/30 shadow-xs shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-extrabold text-sm text-navy truncate">{p.name}</div>
                    <div className="text-[11px] font-bold text-maroon truncate">
                      {p.caste} • {p.age}y
                    </div>
                    <div className="text-[10.5px] text-slate-500 truncate">📍 {p.location}</div>
                  </div>
                </div>

                {/* Job & Children */}
                <div className="text-xs space-y-1 bg-amber-50/60 p-2 rounded-xl border border-gold/20">
                  <div className="font-semibold text-slate-800 truncate">💼 {p.job}</div>
                  <div className="text-[11px] text-slate-600 truncate">💰 {p.salary} • ⭐ {p.star}</div>
                  <div className="text-[10.5px] font-bold text-amber-900 truncate">👶 {p.children}</div>
                </div>

                <div className="text-[11px] text-slate-600 italic line-clamp-2 leading-relaxed">
                  &quot;{p.about}&quot;
                </div>
              </div>

              {/* Card Action */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <Link
                  href={`/search/${p.id}`}
                  className="flex-1 text-center py-2 rounded-xl bg-maroon text-white font-bold text-xs shadow-xs hover:bg-maroon-deep transition"
                >
                  👁️ వివరాలు
                </Link>

                <a
                  href={`https://wa.me/916304996088?text=${encodeURIComponent(
                    `నమస్తే, నేను మన వివాహ లో ${p.name} (${p.id}) పునర్వివాహ ప్రొఫైల్ చూశాను.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs shadow-xs transition"
                  title="WhatsApp"
                >
                  💬
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Banner */}
        <div className="bg-black/30 rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="text-xs text-rose-100">
            <span className="font-bold text-amber-200">📞 గోప్యమైన సహాయం కావాలా?</span> మా సీనియర్ పునర్వివాహ రిలేషన్షిప్ మేనేజర్‌ని నేరుగా సంప్రదించండి (+91 63049 96088).
          </div>
          <a
            href="https://wa.me/916304996088?text=%E0%B0%A8%E0%B0%AE%E0%B0%B8%E0%B1%8D%E0%B0%A4%E0%B1%87%2C%20%E0%B0%A8%E0%B1%87%E0%B0%A8%E0%B1%81%20%E0%B0%AA%E0%B1%81%E0%B0%A8%E0%B0%B0%E0%B1%8D%E0%B0%B5%E0%B0%BF%E0%B0%B5%E0%B0%BE%E0%B0%B9%20%E0%B0%B8%E0%B0%82%E0%B0%AC%E0%B0%82%E0%B0%A7%E0%B0%BE%E0%B0%B2%20%E0%B0%97%E0%B1%81%E0%B0%B0%E0%B0%BF%E0%B0%82%E0%B0%9A%E0%B0%BF%20%E0%B0%B8%E0%B0%AE%E0%B0%BE%E0%B0%9A%E0%B0%BE%E0%B0%B0%E0%B0%82%20%E0%B0%A4%E0%B1%86%E0%B0%B2%E0%B1%81%E0%B0%B8%E0%B1%81%E0%B0%95%E0%B1%8B%E0%B0%B5%E0%B0%BE%E0%B0%B2%E0%B0%A8%E0%B1%81%E0%B0%95%E0%B1%81%E0%B0%82%E0%B0%9F%E0%B1%81%E0%B0%A8%E0%B1%8D%E0%B0%A8%E0%B0%BE%E0%B0%A8%E0%B1%81."
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition whitespace-nowrap"
          >
            💬 WhatsApp కౌన్సెలర్
          </a>
        </div>
      </div>
    </section>
  );
}
