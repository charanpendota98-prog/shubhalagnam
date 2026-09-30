import type { Metadata } from "next";
import PoruthamPageClient from "./page-client";

export const metadata: Metadata = {
  title: "వేద గుణమేళనం రిపోర్ట్ (Porutham / Horoscope Match)",
  description: "10 వేద గుణమేళన సూత్రాల ఆధారంగా పూర్తి జాతక సరిపోలిక రిపోర్ట్ — స్కోర్, నక్షత్రాలు, దోషాలు తెలుగులో వివరంగా.",
  alternates: { canonical: "https://manavivaha.in/porutham" },
};

export default function PoruthamPage() {
  return <PoruthamPageClient />;
}
