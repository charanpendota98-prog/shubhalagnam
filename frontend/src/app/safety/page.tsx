import type { Metadata } from "next";
import SafetyPageClient from "./page-client";

export const metadata: Metadata = {
  title: "సేఫ్టీ & ఫ్రాడ్ ప్రొటెక్షన్ (Trust & Safety Center)",
  description: "మోసాలు, అడ్వాన్స్ మనీ స్కామ్‌ల నుండి రక్షణ చిట్కాలు, రిపోర్ట్ చేసే విధానం, వెరిఫికేషన్ లెవల్స్ — మన వివాహ సేఫ్టీ సెంటర్.",
  alternates: { canonical: "https://manavivaha.in/safety" },
};

export default function SafetyPage() {
  return <SafetyPageClient />;
}
