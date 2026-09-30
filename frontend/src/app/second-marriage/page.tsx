"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { SITE_CONFIG } from "@/lib/site-config";
import { useLang } from "@/lib/lang";
import {
  CASTES,
  CASTE_TELUGU,
  TS_DISTRICTS,
  AP_DISTRICTS,
  DISTRICT_TELUGU,
  DISTRICTS_BY_STATE,
} from "@/lib/telugu-data";

interface ProfileRow {
  tsap_id: string;
  gender: string;
  full_name: string;
  age: number;
  height?: string;
  weight?: string;
  caste?: string;
  sub_caste?: string;
  gothram?: string;
  star?: string;
  rasi?: string;
  education?: string;
  education_detail?: string;
  job?: string;
  company?: string;
  salary?: string;
  work_location?: string;
  district?: string;
  state?: string;
  current_city?: string;
  marital_status?: string;
  children?: string;
  about_myself?: string;
  expectations?: string;
  is_verified?: boolean;
  phone_verified?: boolean;
  photo_urls?: string[];
  photo_url?: string;
  score?: number;
}

const ALL_DISTRICTS = Array.from(new Set([...TS_DISTRICTS, ...AP_DISTRICTS, "USA / NRI", "Other"])).filter(Boolean);

const FALLBACK_PROFILES: ProfileRow[] = [
  {
    tsap_id: "MV2001",
    gender: "Bride",
    full_name: "Sowmya Reddy",
    age: 30,
    height: "5'4\"",
    caste: "Reddy",
    sub_caste: "Motati",
    gothram: "Janakula",
    star: "Uttara",
    rasi: "Kanya",
    education: "BTech (CSE)",
    job: "Senior Software Engineer",
    company: "TCS",
    salary: "18.5L",
    work_location: "Hyderabad",
    district: "Nalgonda",
    state: "TS",
    current_city: "Hyderabad",
    marital_status: "Divorced",
    children: "None",
    about_myself: "IT లో సీనియర్ సాఫ్ట్‌వేర్ ఇంజనీర్‌గా స్థిరపడ్డాను. గత వివాహం పరస్పర అంగీకారంతో ముగిసింది. పిల్లలు లేరు. పరస్పర గౌరవం, మంచి మనసున్న తోడు కోసం చూస్తున్నాం.",
    expectations: "సాఫ్ట్‌వేర్ లేదా ప్రభుత్వ ఉద్యోగం ఉన్న సంస్కారవంతమైన వరుడు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/bride-card.jpg"],
    score: 94,
  },
  {
    tsap_id: "MV2002",
    gender: "Groom",
    full_name: "Rajesh Kamma",
    age: 33,
    height: "5'10\"",
    caste: "Kamma",
    sub_caste: "Chowdary",
    gothram: "Vallutla",
    star: "Swati",
    rasi: "Tula",
    education: "MS (USA) / BTech",
    job: "Staff Software Architect",
    company: "Microsoft",
    salary: "32L",
    work_location: "Hyderabad",
    district: "Krishna",
    state: "AP",
    current_city: "Hyderabad",
    marital_status: "Divorced",
    children: "1 బాబు (Mother Custody)",
    about_myself: "Microsoft లో స్టాఫ్ ఆర్కిటెక్ట్‌గా పనిచేస్తున్నాను. లీగల్ డివోర్స్ పూర్తయింది. పరస్పర నమ్మకంతో కొత్త జీవితాన్ని ప్రారంభించే మంచి తోడు కావాలి.",
    expectations: "ఉన్నత విద్యావంతురాలైన వధువు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/groom-kamma.jpg"],
    score: 92,
  },
  {
    tsap_id: "MV2003",
    gender: "Bride",
    full_name: "Dr. Madhavi Varma",
    age: 32,
    height: "5'5\"",
    caste: "Raju",
    sub_caste: "Kshatriya",
    gothram: "Vasishta",
    star: "Rohini",
    rasi: "Vrishabha",
    education: "MBBS, MD (Pediatrics)",
    job: "Consultant Pediatrician",
    company: "Apollo Hospitals",
    salary: "24L",
    work_location: "Visakhapatnam",
    district: "Visakhapatnam",
    state: "AP",
    current_city: "Visakhapatnam",
    marital_status: "Widow",
    children: "1 పాప (5 yrs)",
    about_myself: "అపోలో హాస్పిటల్ లో పీడియాట్రీషియన్‌గా చేస్తున్నాను. భర్త గతించారు. 5 ఏళ్ల పాప ఉంది. పాపను సొంత బిడ్డలా చూసుకునే సంస్కారవంతమైన జీవిత భాగస్వామి కావాలి.",
    expectations: "డాక్టర్ లేదా ఉన్నత ఉద్యోగంలో ఉన్న వరుడు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/bride-kapu.jpg"],
    score: 96,
  },
  {
    tsap_id: "MV2004",
    gender: "Groom",
    full_name: "Sudhakar Rao Velama",
    age: 36,
    height: "5'11\"",
    caste: "Velama",
    sub_caste: "Padmanayaka",
    gothram: "Recharla",
    star: "Punarvasu",
    rasi: "Karka",
    education: "MTech",
    job: "Executive Engineer (Irrigation)",
    company: "Govt of Telangana",
    salary: "16L",
    work_location: "Warangal",
    district: "Warangal",
    state: "TS",
    current_city: "Warangal",
    marital_status: "Widower",
    children: "1 బాబు (7 yrs)",
    about_myself: "తెలంగాణ ప్రభుత్వ నీటిపారుదల శాఖలో గెజిటెడ్ ఇంజనీర్‌గా పనిచేస్తున్నాను. భార్య గతించారు. 7 ఏళ్ల బాబు ఉన్నాడు. కుటుంబ విలువలు తెలిసిన మంచి మనసున్న జీవిత భాగస్వామి కావాలి.",
    expectations: "కుటుంబ బాధ్యతలను గౌరవించే సుగుణవంతురాలైన వధువు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/groom-vysya.jpg"],
    score: 90,
  },
  {
    tsap_id: "MV2005",
    gender: "Bride",
    full_name: "Sandhya Vysya",
    age: 29,
    height: "5'3\"",
    caste: "Arya Vysya",
    sub_caste: "Arya Vysya",
    gothram: "Upamanyu",
    star: "Hasta",
    rasi: "Kanya",
    education: "CA / BCom",
    job: "Senior Finance Manager",
    company: "Deloitte India",
    salary: "22L",
    work_location: "Hyderabad",
    district: "Guntur",
    state: "AP",
    current_city: "Hyderabad",
    marital_status: "Divorced",
    children: "None",
    about_myself: "డెలాయిట్ లో సీనియర్ ఫైనాన్స్ మేనేజర్ (CA). గత వివాహం 3 నెలల్లో ముగిసింది. లీగల్ డివోర్స్ ఆర్డర్ ఉంది. పిల్లలు లేరు. ఉన్నత విద్యావంతుడైన వరుడు కావాలి.",
    expectations: "CA / Software / Business లో స్థిరపడిన ఆర్యవైశ్య వరుడు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/cine-1.jpg"],
    score: 95,
  },
  {
    tsap_id: "MV2006",
    gender: "Groom",
    full_name: "Venkatesh Kapu",
    age: 34,
    height: "5'9\"",
    caste: "Kapu",
    sub_caste: "Telaga",
    gothram: "Kasyapa",
    star: "Uttarabhadra",
    rasi: "Meena",
    education: "MBA / BTech",
    job: "Senior Product Manager",
    company: "Amazon",
    salary: "28L",
    work_location: "Hyderabad",
    district: "East Godavari",
    state: "AP",
    current_city: "Hyderabad",
    marital_status: "Divorced",
    children: "None",
    about_myself: "అమెజాన్ లో సీనియర్ ప్రాడక్ట్ మేనేజర్. గత వివాహం పరస్పర సమ్మతితో ముగిసింది. పిల్లలు లేరు. పాజిటివ్ మైండ్‌సెట్ గల భాగస్వామి కావాలి.",
    expectations: "ఉద్యోగం లేదా వ్యాపారం చేసే విద్యావంతురాలైన వధువు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/story-1.jpg"],
    score: 91,
  },
  {
    tsap_id: "MV2007",
    gender: "Bride",
    full_name: "Anuradha Padmashali",
    age: 31,
    height: "5'4\"",
    caste: "Padmashali",
    sub_caste: "Padmashali",
    gothram: "Markandeya",
    star: "Revati",
    rasi: "Meena",
    education: "MSc, BEd",
    job: "Govt High School Teacher",
    company: "Govt of Telangana",
    salary: "8.5L",
    work_location: "Karimnagar",
    district: "Karimnagar",
    state: "TS",
    current_city: "Karimnagar",
    marital_status: "Divorced",
    children: "None",
    about_myself: "తెలంగాణ ప్రభుత్వ ఉపాధ్యాయురాలిగా పనిచేస్తున్నాను. లీగల్ డివోర్స్ పూర్తయింది. పిల్లలు లేరు. మంచి కుటుంబ విలువలని గౌరవించే ఉద్యోగి కావాలి.",
    expectations: "స్థిరపడిన పద్మశాలి లేదా ఇతర సంస్కారవంతమైన వరుడు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/cine-2.jpg"],
    score: 93,
  },
  {
    tsap_id: "MV2008",
    gender: "Groom",
    full_name: "Dr. Karthik Sharma",
    age: 35,
    height: "5'10\"",
    caste: "Brahmin",
    sub_caste: "Niyogi",
    gothram: "Kaundinya",
    star: "Arudra",
    rasi: "Mithuna",
    education: "BDS, MDS (Orthodontics)",
    job: "Clinic Director & Consultant",
    company: "Sri Sai Dental Speciality",
    salary: "26L",
    work_location: "Tirupati",
    district: "Tirupati",
    state: "AP",
    current_city: "Tirupati",
    marital_status: "Divorced",
    children: "None",
    about_myself: "తిరుపతిలో సొంత డెంటల్ క్లినిక్ ఉంది. వైదిక సంప్రదాయాలు ఉన్నాయి. గత వివాహం mutual consent తో ముగిసింది. పిల్లలు లేరు.",
    expectations: "సంస్కారవంతమైన బ్రాహ్మణ వధువు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/story-2.jpg"],
    score: 89,
  },
  {
    tsap_id: "MV2012",
    gender: "Groom",
    full_name: "Srinivas Reddy (NRI USA)",
    age: 35,
    height: "6'0\"",
    caste: "Reddy",
    sub_caste: "Pakanati",
    gothram: "Bharadwaj",
    star: "Sravana",
    rasi: "Makara",
    education: "MS in AI/CS (USA)",
    job: "AI Principal Engineer (USA)",
    company: "Tech Giant, Dallas",
    salary: "1.4 Cr ($165k)",
    work_location: "USA / Dallas, Texas",
    district: "Hyderabad",
    state: "TS",
    current_city: "USA / Dallas",
    marital_status: "Divorced",
    children: "None",
    about_myself: "USA లో AI ప్రిన్సిపల్ ఇంజనీర్‌గా స్థిరపడ్డాను (Green Card track). పిల్లలు లేరు. USA కి రీలోకేట్ అవ్వడానికి సిద్ధంగా ఉన్న తోడు కావాలి.",
    expectations: "Software / BTech / MS వధువు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/story-4.jpg"],
    score: 97,
  },
  {
    tsap_id: "MV2019",
    gender: "Bride",
    full_name: "Swapna Kamma",
    age: 31,
    height: "5'5\"",
    caste: "Kamma",
    sub_caste: "Chowdary",
    gothram: "Vallutla",
    star: "Uttara",
    rasi: "Kanya",
    education: "MS (USA) / BTech",
    job: "Senior Data Scientist",
    company: "Amazon AWS",
    salary: "25L",
    work_location: "Hyderabad",
    district: "Guntur",
    state: "AP",
    current_city: "Hyderabad",
    marital_status: "Divorced",
    children: "None",
    about_myself: "AWS హైదరాబాద్ లో సీనియర్ డేటా సైంటిస్ట్‌గా పనిచేస్తున్నాను. mutual consent డివోర్స్. పిల్లలు లేరు. అర్థం చేసుకునే కమ్మ వరుడు కావాలి.",
    expectations: "IT / MS (USA) / Business వరుడు కావాలి.",
    is_verified: true,
    photo_urls: ["/promo/cine-1.jpg"],
    score: 95,
  },
];

export default function SecondMarriagePage() {
  const { lang } = useLang();
  const te = lang === "te";

  // Filter states
  const [gender, setGender] = useState<string>("");
  const [maritalFilter, setMaritalFilter] = useState<string>("");
  const [childrenFilter, setChildrenFilter] = useState<string>("");
  const [selectedCaste, setSelectedCaste] = useState<string>("");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [ageMax, setAgeMax] = useState<number>(55);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("all");

  const [profiles, setProfiles] = useState<ProfileRow[]>(FALLBACK_PROFILES);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  // Load profiles from API with second_marriage flag
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    apiGet<{ results?: ProfileRow[]; total?: number }>("/api/search?second_marriage=true&limit=60")
      .then(({ ok, data }) => {
        if (!isMounted) return;
        if (ok && data?.results && data.results.length > 0) {
          // Filter out Never Married if any slipped through
          const filtered = data.results.filter(
            (p) =>
              p.marital_status &&
              !["pelli kaledu", "never married", "unmarried"].includes(p.marital_status.toLowerCase().trim())
          );
          if (filtered.length > 0) {
            setProfiles(filtered);
          } else {
            setProfiles(FALLBACK_PROFILES);
          }
        } else {
          setProfiles(FALLBACK_PROFILES);
        }
      })
      .catch(() => {
        if (isMounted) setProfiles(FALLBACK_PROFILES);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Quick preset tab change handler
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === "all") {
      setGender("");
      setChildrenFilter("");
      setMaritalFilter("");
    } else if (tab === "brides") {
      setGender("Bride");
      setChildrenFilter("");
    } else if (tab === "grooms") {
      setGender("Groom");
      setChildrenFilter("");
    } else if (tab === "no_children") {
      setGender("");
      setChildrenFilter("None");
    } else if (tab === "with_children") {
      setGender("");
      setChildrenFilter("with_children");
    } else if (tab === "divorced") {
      setMaritalFilter("Divorced");
    } else if (tab === "widow") {
      setMaritalFilter("Widow");
    }
  };

  // Filtered profile list
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Gender filter
      if (gender && p.gender?.toLowerCase() !== gender.toLowerCase()) return false;

      // Marital status filter
      if (maritalFilter) {
        const m = (p.marital_status || "").toLowerCase();
        if (maritalFilter === "Divorced" && !m.includes("divorc") && !m.includes("విడాకు")) return false;
        if (maritalFilter === "Widow" && !m.includes("widow") && !m.includes("వితంతు") && !m.includes("విధురు")) return false;
        if (maritalFilter === "Awaiting Divorce" && !m.includes("await") && !m.includes("నిరీక్షణ")) return false;
      }

      // Children filter
      if (childrenFilter) {
        const c = (p.children || "None").toLowerCase().trim();
        const hasNoChild = c === "none" || c === "0" || c === "" || c.includes("లేరు");
        if (childrenFilter === "None" && !hasNoChild) return false;
        if (childrenFilter === "with_children" && hasNoChild) return false;
      }

      // Caste filter
      if (selectedCaste) {
        const cVal = (p.caste || "").toLowerCase();
        if (!cVal.includes(selectedCaste.toLowerCase())) return false;
      }

      // District filter
      if (selectedDistrict) {
        const dVal = ((p.district || "") + " " + (p.current_city || "")).toLowerCase();
        if (!dVal.includes(selectedDistrict.toLowerCase())) return false;
      }

      // Age filter
      if (p.age > ageMax) return false;

      // Text query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fullTxt = `${p.full_name} ${p.tsap_id} ${p.caste} ${p.job} ${p.education} ${p.district} ${p.about_myself}`.toLowerCase();
        if (!fullTxt.includes(q)) return false;
      }

      return true;
    });
  }, [profiles, gender, maritalFilter, childrenFilter, selectedCaste, selectedDistrict, ageMax, searchQuery]);

  const toggleSave = (id: string) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetAllFilters = () => {
    setGender("");
    setMaritalFilter("");
    setChildrenFilter("");
    setSelectedCaste("");
    setSelectedDistrict("");
    setAgeMax(55);
    setSearchQuery("");
    setActiveTab("all");
  };

  const getMaritalBadge = (status?: string, genderStr?: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("divorc") || s.includes("విడాకు")) {
      return { label: "🕊️ విడాకులు (Divorced)", bg: "bg-rose-50 text-rose-800 border-rose-200" };
    }
    if (s.includes("widow") || s.includes("వితంతు") || s.includes("విధురు")) {
      const isGroom = genderStr === "Groom" || genderStr === "Male";
      return {
        label: isGroom ? "🕊️ విధురుడు (Widower)" : "🕊️ వితంతువు (Widow)",
        bg: "bg-purple-50 text-purple-800 border-purple-200",
      };
    }
    if (s.includes("await") || s.includes("నిరీక్షణ")) {
      return { label: "⏳ విడాకుల నిరీక్షణ (Awaiting Divorce)", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    }
    return { label: "💍 పునర్వివాహం (Second Marriage)", bg: "bg-amber-50 text-maroon border-gold/40" };
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] pb-20">
      {/* ================= HERO HEADER ================= */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#4A0518] via-[#660B25] to-[#8C1438] text-white py-12 px-4 border-b-4 border-gold">
        {/* Decorative Background Circles */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-amber-200 text-xs font-black tracking-wide uppercase shadow-sm">
            <span>💍</span>
            <span>మన వివాహ • పునర్వివాహ ప్రత్యేక వేదిక</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight telugu text-white">
            మరుజన్మ వంటి కొత్త జీవితానికి... <br className="hidden sm:inline" />
            <span className="text-amber-300">గౌరవప్రదమైన తోడు</span>
          </h1>

          <p className="max-w-3xl mx-auto text-xs sm:text-sm md:text-base text-rose-100/90 leading-relaxed font-medium">
            {te
              ? "విడాకులు పొందినవారు మరియు వితంతువుల కోసం ప్రత్యేకంగా రూపొందించబడిన విశ్వసనీయ తెలుగు మ్యాట్రిమోనీ వేదిక. 100% గోప్యత, లీగల్ క్లారిటీ మరియు పరస్పర గౌరవంతో కూడిన సంబంధాలు."
              : "Dignified, 100% verified and confidential Second Marriage Matrimony for Divorced, Widowed & Remarriage brides and grooms across Andhra Pradesh, Telangana & NRI Telugu community."}
          </p>

          {/* 4 Pillar Trust Badges */}
          <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5 max-w-4xl mx-auto text-left">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">🔒</span>
              <div>
                <div className="text-xs font-black text-amber-200">100% గోప్యత & ప్రైవసీ</div>
                <div className="text-[10px] text-rose-100">ఫోటో & ఫోన్ లాక్ రక్షణ</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">⚖️</span>
              <div>
                <div className="text-xs font-black text-amber-200">లీగల్ స్టేటస్ క్లారిటీ</div>
                <div className="text-[10px] text-rose-100">ధృవీకరించబడిన వివరాలు</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">👶</span>
              <div>
                <div className="text-xs font-black text-amber-200">పిల్లల వివరాల స్పష్టత</div>
                <div className="text-[10px] text-rose-100">కస్టడీ & సంరక్షణ క్లారిటీ</div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 flex items-center gap-2.5">
              <span className="text-2xl">👩‍💼</span>
              <div>
                <div className="text-xs font-black text-amber-200">సీనియర్ కౌన్సెలర్లు</div>
                <div className="text-[10px] text-rose-100">వ్యక్తిగత సహాయం & కేర్</div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <Link
              href="/register"
              className="px-6 py-3 rounded-2xl gold-gradient text-maroon font-black text-xs sm:text-sm shadow-lg hover-lift flex items-center gap-2"
            >
              <span>📝</span>
              <span>పునర్వివాహ ఉచిత నమోదు (Register Free)</span>
            </Link>

            <a
              href="https://wa.me/916304996088?text=%E0%B0%A8%E0%B0%AE%E0%B0%B8%E0%B1%8D%E0%B0%A4%E0%B1%87%2C%20%E0%B0%A8%E0%B1%87%E0%B0%A8%E0%B1%81%20%E0%B0%AE%E0%B0%A8%20%E0%B0%B5%E0%B0%BF%E0%B0%B5%E0%B0%BE%E0%B0%B9%20%E0%B0%AA%E0%B1%81%E0%B0%A8%E0%B0%B0%E0%B1%8D%E0%B0%B5%E0%B0%BF%E0%B0%B5%E0%B0%BE%E0%B0%B9%20%E0%B0%B8%E0%B1%87%E0%B0%B5%E0%B0%B2%20%E0%B0%97%E0%B1%81%E0%B0%B0%E0%B0%BF%E0%B0%82%E0%B0%9A%E0%B0%BF%20%E0%B0%B5%E0%B0%BF%E0%B0%B5%E0%B0%B0%E0%B0%BE%E0%B0%B2%E0%B1%81%20%E0%B0%A4%E0%B1%86%E0%B0%B2%E0%B1%81%E0%B0%B8%E0%B1%81%E0%B0%95%E0%B1%8B%E0%B0%B5%E0%B0%BE%E0%B0%B2%E0%B0%A8%E0%B1%81%E0%B0%95%E0%B1%81%E0%B0%82%E0%B0%9F%E0%B1%81%E0%B0%A8%E0%B1%8D%E0%B0%A8%E0%B0%BE%E0%B0%A8%E0%B1%81."
              target="_blank"
              rel="noreferrer"
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition flex items-center gap-2"
            >
              <span>💬</span>
              <span>రిలేషన్షిప్ కౌన్సెలర్ వాట్సాప్ (+91 63049 96088)</span>
            </a>
          </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Quick Filter Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: "all", l: "🌟 అందరూ (All Remarriage)", icon: "💍" },
            { id: "brides", l: "👰 వధువులు (Brides)", icon: "👰" },
            { id: "grooms", l: "🤵 వరులు (Grooms)", icon: "🤵" },
            { id: "no_children", l: "🕊️ పిల్లలు లేనివారు (No Children)", icon: "🕊️" },
            { id: "with_children", l: "👶 పిల్లలు ఉన్నవారు (With Children)", icon: "👶" },
            { id: "divorced", l: "⚖️ విడాకులు (Divorced)", icon: "⚖️" },
            { id: "widow", l: "🌸 వితంతువు / విధురుడు", icon: "🌸" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`whitespace-nowrap px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 border ${
                activeTab === tab.id
                  ? "bg-maroon text-white border-maroon shadow-md"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.l}</span>
            </button>
          ))}
        </div>

        {/* Detailed Search & Filter Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gold/30 card-shadow space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                🔍 {te ? "వెతకండి (Search Name/ID/Job)" : "Search keyword / ID"}
              </label>
              <input
                type="text"
                placeholder={te ? "ఉదా: MV2001, Software, Reddy..." : "e.g. MV2001, Doctor, Kamma..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
              />
            </div>

            {/* Caste Selection */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                💍 {te ? "కులం (Caste)" : "Caste"}
              </label>
              <select
                value={selectedCaste}
                onChange={(e) => setSelectedCaste(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
              >
                <option value="">{te ? "అన్ని కులాలు (All Castes)" : "All Castes"}</option>
                {CASTES.map((c) => (
                  <option key={c} value={c}>
                    {CASTE_TELUGU[c] ? `${CASTE_TELUGU[c]} (${c})` : c}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                📍 {te ? "జిల్లా / నగరం (District / City)" : "District / Location"}
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-maroon"
              >
                <option value="">{te ? "అన్ని జిల్లాలు (All Districts)" : "All Districts (TS/AP/NRI)"}</option>
                {ALL_DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {DISTRICT_TELUGU[d] ? `${DISTRICT_TELUGU[d]} (${d})` : d}
                  </option>
                ))}
              </select>
            </div>

            {/* Age Range Filter */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-extrabold text-slate-700">
                  🎂 {te ? "గరిష్ట వయసు (Max Age)" : "Max Age"}
                </label>
                <span className="text-xs font-black text-maroon">{ageMax} yrs</span>
              </div>
              <input
                type="range"
                min={22}
                max={60}
                value={ageMax}
                onChange={(e) => setAgeMax(parseInt(e.target.value))}
                className="w-full accent-[#7A0C2E] cursor-pointer"
              />
            </div>
          </div>

          {/* Active Filter Summary and Clear Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="text-slate-600 font-bold">
              <span>{te ? "లభించిన పునర్వివాహ సంబంధాలు:" : "Matching Remarriage Profiles:"} </span>
              <span className="text-maroon font-black text-sm">{filteredProfiles.length}</span>
            </div>

            {(gender || maritalFilter || childrenFilter || selectedCaste || selectedDistrict || ageMax < 55 || searchQuery) && (
              <button
                onClick={resetAllFilters}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1"
              >
                <span>✕</span>
                <span>{te ? "ఫిల్టర్లు రీసెట్ చేయండి (Reset All)" : "Reset Filters"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= PROFILE CARDS GRID ================= */}
        {loading ? (
          <div className="grid md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-24 bg-slate-200 rounded-2xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                    <div className="h-3 bg-slate-200 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-gold/30 card-shadow space-y-4">
            <div className="text-4xl">🔍</div>
            <h3 className="text-lg font-bold text-navy">
              {te ? "మీరు ఎంచుకున్న ఫిల్టర్లతో సంబంధాలు కనిపించలేదు" : "No profiles found matching selected filters"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {te
                ? "దయచేసి ఫిల్టర్లను కాస్త సడలించి ప్రయత్నించండి లేదా మా సీనియర్ రిలేషన్షిప్ మేనేజర్ సహాయం తీసుకోండి."
                : "Try broadening your filters or reach out to our senior relationship counselor on WhatsApp."}
            </p>
            <button
              onClick={resetAllFilters}
              className="px-6 py-2.5 rounded-xl maroon-gradient text-white font-bold text-xs shadow-md"
            >
              {te ? "ఫిల్టర్లు రీసెట్ చేయండి" : "Reset All Filters"}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-5">
            {filteredProfiles.map((row) => {
              const photo = row.photo_url || (Array.isArray(row.photo_urls) && row.photo_urls[0]) || "";
              const maritalBadge = getMaritalBadge(row.marital_status, row.gender);
              const isSaved = savedIds.includes(row.tsap_id);

              return (
                <div
                  key={row.tsap_id}
                  className="bg-white rounded-3xl border border-gold/30 card-shadow hover:border-gold hover:shadow-xl transition overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-4 sm:p-5 space-y-3.5">
                    {/* Top Remarriage Special Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[10.5px] font-black px-2.5 py-0.5 rounded-full border ${maritalBadge.bg}`}>
                          {maritalBadge.label}
                        </span>

                        {row.children && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                            👶 {row.children === "None" ? "పిల్లలు లేరు (No Children)" : row.children}
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">
                        ID: {row.tsap_id}
                      </span>
                    </div>

                    {/* Profile Avatar & Details */}
                    <div className="flex items-start gap-4">
                      {/* Photo Container */}
                      <div className="relative shrink-0">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={photo}
                            alt={row.full_name}
                            className="w-20 h-24 rounded-2xl object-cover border border-gold/40 shadow-sm"
                          />
                        ) : (
                          <div className="w-20 h-24 rounded-2xl bg-amber-50 border border-gold/30 flex flex-col items-center justify-center text-3xl shadow-inner text-maroon">
                            <span>{row.gender === "Groom" || row.gender === "Male" ? "🤵" : "👰"}</span>
                            <span className="text-[9px] font-bold mt-1 text-slate-500">🔒 Photo Lock</span>
                          </div>
                        )}
                        {row.is_verified && (
                          <span
                            className="absolute -bottom-2 -right-1 bg-emerald-600 text-white rounded-full p-1 shadow"
                            title="100% Verified Profile"
                          >
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </div>

                      {/* Bio Meta */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <Link
                            href={`/search/${row.tsap_id}`}
                            className="font-black text-base text-navy hover:text-maroon truncate"
                          >
                            {row.full_name}
                          </Link>

                          <button
                            onClick={() => toggleSave(row.tsap_id)}
                            className={`p-1.5 rounded-full transition ${
                              isSaved ? "text-rose-600 bg-rose-50" : "text-slate-400 hover:text-rose-500"
                            }`}
                            title={isSaved ? "Saved" : "Shortlist"}
                          >
                            {isSaved ? "❤️" : "🤍"}
                          </button>
                        </div>

                        <p className="text-xs font-bold text-maroon flex flex-wrap items-center gap-1.5">
                          <span>💍 {row.caste || "Telugu"}</span>
                          {row.sub_caste && <span className="text-slate-500">({row.sub_caste})</span>}
                          <span className="text-slate-300">•</span>
                          <span>🎂 {row.age} yrs</span>
                          {row.height && <span>• {row.height}</span>}
                        </p>

                        <p className="text-xs text-slate-800 font-medium truncate">
                          🎓 {row.education || "Graduate"} • 💼 {row.job || "Professional"}
                          {row.company && ` (${row.company})`}
                        </p>

                        <p className="text-[11.5px] text-slate-500 truncate">
                          📍 {row.district || "Hyderabad"}, {row.state || "TS"} • 💰 {row.salary || "Best in Industry"}
                        </p>

                        <div className="text-[11px] text-slate-500 font-mono pt-0.5">
                          📞 {te ? "Number: 🔒 •••••••••• (గోప్యత కొరకు దాచబడింది)" : "Number: 🔒 •••••••••• (Protected)"}
                        </div>
                      </div>
                    </div>

                    {/* About Quote */}
                    {row.about_myself && (
                      <div className="bg-amber-50/50 p-2.5 rounded-2xl border border-gold/20 text-xs text-slate-700 italic leading-relaxed">
                        &quot;{row.about_myself}&quot;
                      </div>
                    )}

                    {/* Horoscope Tags */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {row.star && (
                          <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-[10.5px]">
                            ⭐ {row.star}
                          </span>
                        )}
                        {row.rasi && (
                          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-[10.5px]">
                            {row.rasi}
                          </span>
                        )}
                        {row.gothram && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10.5px]">
                            గోత్రం: {row.gothram}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-black text-maroon flex items-center gap-1">
                        <span>🎯 {row.score || 92}% Match</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="bg-slate-50 p-3 px-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/search/${row.tsap_id}`}
                      className="flex-1 min-w-[90px] text-center py-2.5 px-3 rounded-xl border border-maroon/30 text-maroon bg-white hover:bg-cream text-xs font-bold transition shadow-xs"
                    >
                      👁️ {te ? "పూర్తి వివరాలు" : "View Profile"}
                    </Link>

                    <a
                      href={`https://wa.me/916304996088?text=${encodeURIComponent(
                        `నమస్తే, నేను మన వివాహ లో ${row.full_name} (${row.tsap_id}) పునర్వివాహ ప్రొఫైల్ చూశాను. సంప్రదించడానికి వివరాలు కావాలి.`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-w-[130px] text-center py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <span>💬</span>
                      <span>{te ? "సంప్రదించండి" : "WhatsApp Chat"}</span>
                    </a>

                    <Link
                      href={`/biodata?id=${row.tsap_id}&remarriage=true`}
                      className="text-center py-2.5 px-3 rounded-xl border border-gold/40 text-amber-900 bg-amber-50 hover:bg-amber-100 text-xs font-bold transition"
                      title="Generate Remarriage Biodata"
                    >
                      🎴 బయోడేటా
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ================= COUNSELING & FAQ SECTION ================= */}
        <div className="grid md:grid-cols-2 gap-6 pt-6">
          {/* Counselor Helpline Box */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border border-gold/40 card-shadow space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-maroon text-white flex items-center justify-center text-2xl shadow-md">
                👩‍💼
              </div>
              <div>
                <h3 className="font-black text-base text-maroon">
                  {te ? "పునర్వివాహ సీనియర్ కౌన్సెలర్ సేవలు" : "Senior Remarriage Counselor Support"}
                </h3>
                <p className="text-xs text-slate-600">
                  {te ? "వ్యక్తిగత అవసరాలు & సంప్రదింపుల కోసం" : "Confidential 1-on-1 personalized assistance"}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {te
                ? "పునర్వివాహంలో లీగల్ అంశాలు, పిల్లల సంరక్షణ మరియు కుటుంబ సమన్వయం చాలా ముఖ్యం. మా సీనియర్ రిలేషన్షిప్ మేనేజర్లు పూర్తి గోప్యతతో మీకు సరైన సంబంధాన్ని వెతకడంలో సహాయపడతారు."
                : "Remarriages require emotional maturity, legal clarity and family alignment. Our senior team is here to assist you with utmost confidentiality."}
            </p>

            <div className="bg-white p-3.5 rounded-2xl border border-gold/30 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10.5px] font-bold text-slate-500">అధికారిక హెల్ప్‌లైన్:</div>
                <div className="text-sm font-black text-maroon font-mono">+91 63049 96088</div>
              </div>
              <a
                href="https://wa.me/916304996088?text=%E0%B0%A8%E0%B0%AE%E0%B0%B8%E0%B1%8D%E0%B0%A4%E0%B1%87%2C%20%E0%B0%A8%E0%B1%87%E0%B0%A8%E0%B1%81%20%E0%B0%AA%E0%B1%81%E0%B0%A8%E0%B0%B0%E0%B1%8D%E0%B0%B5%E0%B0%BF%E0%B0%B5%E0%B0%BE%E0%B0%B9%20%E0%B0%95%E0%B1%8C%E0%B0%A8%E0%B1%8D%E0%B0%B8%E0%B1%86%E0%B0%B2%E0%B0%BF%E0%B0%82%E0%B0%97%E0%B1%8D%20%E0%B0%B8%E0%B0%B9%E0%B0%BE%E0%B0%AF%E0%B0%82%20%E0%B0%95%E0%B1%8B%E0%B0%B0%E0%B1%81%E0%B0%95%E0%B1%81%E0%B0%82%E0%B0%9F%E0%B1%81%E0%B0%A8%E0%B1%8D%E0%B0%A8%E0%B0%BE%E0%B0%A8%E0%B1%81."
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
              >
                💬 WhatsApp Chat
              </a>
            </div>
          </div>

          {/* Remarriage Guiding Principles */}
          <div className="bg-white rounded-3xl p-6 border border-gold/30 card-shadow space-y-3.5">
            <h3 className="font-black text-base text-navy flex items-center gap-2">
              <span>🪔</span>
              <span>{te ? "పునర్వివాహంలో ముఖ్యమైన సూత్రాలు" : "Guiding Principles for Remarriage"}</span>
            </h3>

            <ul className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <b>పరస్పర పారదర్శకత:</b> గత వివాహ వివరాలు, లీగల్ స్టేటస్ మరియు ఆర్థిక విషయాలపై ముందే స్పష్టత ఉండాలి.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <b>పిల్లల భవిష్యత్తు:</b> పిల్లలు ఉన్నట్లయితే వారి మానసిక స్థైర్యం మరియు బాధ్యతలపై సమాన ప్రాధాన్యత.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <b>కుటుంబ ఆమోదం:</b> ఇరువైపులా కుటుంబ సభ్యుల పరస్పర గౌరవం మరియు సంప్రదాయాల సమన్వయం.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>
                  <b>గోప్యతా హక్కు:</b> అనవసరమైన విచారణలు లేకుండా పరస్పర గౌరవంతో సంబంధాన్ని ముందుకు తీసుకెళ్లడం.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
