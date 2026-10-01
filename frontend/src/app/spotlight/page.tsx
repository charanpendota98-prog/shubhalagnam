import type { Metadata } from "next";
import SpotlightPromotionPageClient from "./page-client";

export const metadata: Metadata = {
  title: "ప్రొఫైల్ ప్రమోట్ చేసుకోండి (Spotlight — Profile of the Day)",
  description: "మీ ప్రొఫైల్‌ను హోమ్‌పేజీ & ఛానెల్స్ టాప్‌లో ప్రమోట్ చేసుకోండి — ఎక్కువ మందికి కనిపించండి, త్వరగా మ్యాచ్ అవ్వండి.",
  alternates: { canonical: "https://manavivaha.in/spotlight" },
};

export default function SpotlightPromotionPage() {
  return <SpotlightPromotionPageClient />;
}
