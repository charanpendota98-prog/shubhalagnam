import type { Metadata } from "next";
import BureauPageClient from "./page-client";

export const metadata: Metadata = {
  title: "మ్యారేజ్ బ్యూరో / ఏజెంట్స్ ప్లాన్స్ (Bureau B2B)",
  description: "మ్యారేజ్ బ్యూరోలు & ఏజెంట్ల కోసం ప్రత్యేక బల్క్ ప్లాన్స్ — ఎక్కువ ప్రొఫైల్స్, నెలవారీ engaged రిపోర్ట్.",
  alternates: { canonical: "https://manavivaha.in/bureau" },
};

export default function BureauPage() {
  return <BureauPageClient />;
}
