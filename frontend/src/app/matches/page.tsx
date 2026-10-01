import type { Metadata } from "next";
import MatchesPageClient from "./page-client";

export const metadata: Metadata = {
  title: "నా మ్యాచెస్ (My Matches) — కుల, జిల్లా, విద్య ఆధారంగా వెతకండి",
  description: "కులం, ఉప-కులం, జిల్లా, విద్య, ఉద్యోగం, నక్షత్రం ఆధారంగా వేల మంది వధూవరుల ప్రొఫైల్స్‌ను ఫిల్టర్ చేసి వెతకండి — మన వివాహ.",
  alternates: { canonical: "https://manavivaha.in/matches" },
};

export default function MatchesPage() {
  return <MatchesPageClient />;
}
