"use client";

/**
 * Display-only guidance shown on /requests once at least one request has been
 * accepted. It reads nothing, stores nothing and adds no access: it only tells
 * families what a sensible next step looks like and links to the safety page.
 */
import Link from "next/link";
import { useLang } from "@/lib/lang";

export default function AcceptedNextSteps() {
  const { lang } = useLang();
  const te = lang === "te";
  const steps = te
    ? [
        "మొదట మిమ్మల్ని, మీ కుటుంబాన్ని పరిచయం చేసుకోండి. ఎవరితో మాట్లాడుతున్నారో మీ తల్లిదండ్రులకు లేదా పెద్దలకు చెప్పండి.",
        "కలవాలంటే అందరికీ తెలిసిన బహిరంగ ప్రదేశంలో కలవండి. సమయం, చోటు కుటుంబానికి చెప్పండి.",
        "డబ్బు, బహుమతులు, ఆధార్, PAN, బ్యాంక్ వివరాలు సభ్యులెవరికీ ఇవ్వకండి. వెరిఫికేషన్ కోసం ఈ సైట్‌లోని ఫారమ్‌లో మాత్రమే ఇవ్వండి. ఎవరైనా అడిగితే రిపోర్ట్ చేయండి.",
      ]
    : [
        "Start by introducing yourself and your family. Tell your parents or elders who you are talking to.",
        "If you decide to meet, choose a public place and let your family know the time and the place.",
        "Never send money, gifts, or Aadhaar, PAN or bank details to another member. Share ID details only in this site's own verification form. Report anyone who asks.",
      ];
  return (
    <section data-testid="accepted-next-steps" aria-label={te ? "అంగీకారం తర్వాత తదుపరి దశలు" : "Next steps after acceptance"}
      className="mb-4 rounded-2xl border border-gold/40 bg-white p-4">
      <h2 className={`text-[14px] font-bold text-maroon ${te ? "telugu" : ""}`}>
        {te ? "అంగీకారం తర్వాత తదుపరి దశలు" : "Next steps after acceptance"}
      </h2>
      <ol className="mt-2 space-y-2 text-[13px] leading-relaxed text-slate-700">
        {steps.map((line, index) => (
          <li key={index} className={`flex gap-2 ${te ? "telugu" : ""}`}>
            <span aria-hidden="true" className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-maroon text-[11px] font-bold text-white">{index + 1}</span>
            <span>{line}</span>
          </li>
        ))}
      </ol>
      <Link href="/safety" className="mt-3 inline-flex min-h-11 items-center text-[13px] font-bold text-maroon underline">
        {te ? "భద్రతా సూచనలు చదవండి" : "Read the safety tips"}
      </Link>
    </section>
  );
}
