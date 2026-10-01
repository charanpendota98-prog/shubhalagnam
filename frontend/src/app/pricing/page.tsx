import type { Metadata } from "next";
import PricingPageClient from "./page-client";

export const metadata: Metadata = {
  title: "ధరలు & ప్లాన్స్ (Pricing) — ₹29 నుంచి",
  description: "మన వివాహ ధరలు — ₹29, ₹99, ₹199, ₹299, ₹499 ప్లాన్స్. రిజిస్ట్రేషన్ + మొదటి 3 ఇంట్రెస్ట్ రిక్వెస్ట్స్ ఉచితం. దాచిన ఛార్జీలు లేవు.",
  alternates: { canonical: "https://manavivaha.in/pricing" },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
