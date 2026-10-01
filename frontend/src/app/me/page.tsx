import type { Metadata } from "next";
import MePageClient from "./page-client";

export const metadata: Metadata = {
  title: "నా ఖాతా (My Account & Profile)",
  description: "మీ ప్రొఫైల్‌ను ఎడిట్ చేసుకోండి, అన్‌లాక్స్/బూస్ట్/జాతకం చూసుకోండి — మన వివాహ నా ఖాతా.",
  alternates: { canonical: "https://manavivaha.in/me" },
  robots: { index: false, follow: false },
};

export default function MePage() {
  return <MePageClient />;
}
