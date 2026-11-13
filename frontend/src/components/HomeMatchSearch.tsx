"use client";

/**
 * 🔎 HOME PROFILE SEARCH — the single primary action of the hero.
 * ==============================================================
 * Deliberately short: who + age + region, then one unambiguous submit.
 * Every value maps to a filter the /matches page already understands, so the
 * search never invents a facet and never posts to a new endpoint.
 *
 * Mobile-first details:
 *  • bride/groom are 44px segmented controls, always side by side;
 *  • selects use `.ds-control` (16px on phones → no iOS focus zoom);
 *  • the heading is short enough to stay on two lines at 360px.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MapPin, Search, ShieldCheck } from "lucide-react";
import { useLang } from "@/lib/lang";
import { Button, Field } from "@/components/ui";

type Gender = "Bride" | "Groom" | "";
type Region = "" | "TS" | "AP" | "NRI";

const AGE_RANGES = [
  { value: "all", min: 18, max: 60, en: "Any adult age", te: "అన్ని వయస్సులు" },
  { value: "18-24", min: 18, max: 24, en: "18–24 years", te: "18–24 సంవత్సరాలు" },
  { value: "25-29", min: 25, max: 29, en: "25–29 years", te: "25–29 సంవత్సరాలు" },
  { value: "30-34", min: 30, max: 34, en: "30–34 years", te: "30–34 సంవత్సరాలు" },
  { value: "35-39", min: 35, max: 39, en: "35–39 years", te: "35–39 సంవత్సరాలు" },
  { value: "40-49", min: 40, max: 49, en: "40–49 years", te: "40–49 సంవత్సరాలు" },
  { value: "50-60", min: 50, max: 60, en: "50–60 years", te: "50–60 సంవత్సరాలు" },
] as const;

export default function HomeMatchSearch() {
  const router = useRouter();
  const { lang } = useLang();
  const te = lang === "te";
  const [gender, setGender] = useState<Gender>("");
  const [ageRange, setAgeRange] = useState<(typeof AGE_RANGES)[number]["value"]>("all");
  const [region, setRegion] = useState<Region>("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (gender) params.set("gender", gender);
    const age = AGE_RANGES.find((option) => option.value === ageRange) ?? AGE_RANGES[0];
    if (age.value !== "all") {
      params.set("age_min", String(age.min));
      params.set("age_max", String(age.max));
    }
    if (region === "NRI") params.set("nri_only", "true");
    else if (region) params.set("state", region);
    const query = params.toString();
    router.push(query ? `/matches?${query}` : "/matches");
  };

  return (
    <section
      className="mx-auto w-full max-w-[560px] rounded-[1.4rem] bg-[#FFFDF9] p-4 text-slate-900 sm:p-5 lg:mr-0 lg:ml-auto"
      aria-labelledby="home-match-search-title"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#7A0C2E] text-[#ffe9b0] shadow-sm">
          <Search size={20} strokeWidth={2.3} aria-hidden="true" />
        </span>
        <div className="min-w-0 pt-0.5">
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#8B5364]">
            {te ? "ఇక్కడే ప్రారంభించండి" : "Search first"}
          </p>
          <h2
            id="home-match-search-title"
            className="mt-1 text-[1.05rem] font-extrabold leading-snug tracking-tight text-slate-950 sm:text-xl"
          >
            {te ? "సంబంధాలను వెతకండి" : "Find profiles"}
          </h2>
        </div>
      </div>

      <form
        onSubmit={submit}
        role="search"
        aria-label={te ? "సంబంధాల శోధన" : "Profile search"}
        className="mt-4 space-y-3.5"
      >
        {/* Who — a compact segmented control on phones (side-by-side avoids the
            two stacked 44px rows that pushed the rest of the form off-screen). */}
        <div role="group" aria-label={te ? "వధువు లేదా వరుడు" : "Bride or groom"} className="space-y-1.5">
          <span className="block text-xs font-bold text-slate-700">
            {te ? "మీరు ఎవరిని వెతుకుతున్నారు?" : "I’m looking for"}
          </span>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1">
            {([
              { value: "Bride" as const, en: "A bride", te: "వధువు" },
              { value: "Groom" as const, en: "A groom", te: "వరుడు" },
            ]).map((option) => {
              const selected = gender === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setGender(selected ? "" : option.value)}
                  className={`min-h-11 rounded-xl px-2 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7A0C2E] ${selected
                    ? "bg-[#7A0C2E] text-white shadow-sm"
                    : "text-slate-700 hover:bg-white"
                  }`}
                >
                  {te ? option.te : option.en}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field id="home-age" label={te ? "వయస్సు పరిధి" : "Age range"}>
            {({ controlId }) => (
              <select
                id={controlId}
                value={ageRange}
                onChange={(event) => setAgeRange(event.target.value as (typeof AGE_RANGES)[number]["value"])}
                className="ds-control"
              >
                {AGE_RANGES.map((option) => (
                  <option key={option.value} value={option.value}>{te ? option.te : option.en}</option>
                ))}
              </select>
            )}
          </Field>

          <Field
            id="home-region"
            label={
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} aria-hidden="true" /> {te ? "ప్రాంతం" : "Region"}
              </span>
            }
          >
            {({ controlId }) => (
              <select
                id={controlId}
                value={region}
                onChange={(event) => setRegion(event.target.value as Region)}
                className="ds-control"
              >
                <option value="">{te ? "అన్ని ప్రాంతాలు" : "All regions"}</option>
                <option value="TS">{te ? "తెలంగాణ" : "Telangana"}</option>
                <option value="AP">{te ? "ఆంధ్రప్రదేశ్" : "Andhra Pradesh"}</option>
                <option value="NRI">NRI / {te ? "అంతర్జాతీయం" : "International"}</option>
              </select>
            )}
          </Field>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          className="mv-sheen"
          iconLeft={<Search size={16} aria-hidden="true" />}
          iconRight={<ArrowRight size={16} aria-hidden="true" />}
        >
          {te ? "సంబంధాలు చూడండి" : "Browse profiles"}
        </Button>
      </form>

      <div className="mt-3 flex items-start gap-2 border-t border-slate-100 pt-3">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-700" aria-hidden="true" />
        <p className={`text-[11px] leading-relaxed text-slate-600 ${te ? "telugu" : ""}`}>
          {te
            ? "Contact వివరాలు profile owner accept చేసిన తర్వాతే మీ account లో కనిపిస్తాయి. సభ్యులు అందించిన వివరాలను స్వయంగా నిర్ధారించుకోండి."
            : "Contact details appear in your account only after the profile owner accepts. Profile details are member-submitted — verify them yourself."}{" "}
          <Link href="/safety" className="font-semibold text-[#7A0C2E] underline decoration-[#C58A9D] underline-offset-2 hover:text-[#5C0822]">
            {te ? "భద్రత" : "Safety"}
          </Link>
        </p>
      </div>
    </section>
  );
}
