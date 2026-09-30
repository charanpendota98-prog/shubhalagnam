import type { Metadata } from "next";
import DistrictsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "జిల్లాల వారీగా తెలుగు వధూవరులు (District-wise Matrimony)",
  description: "తెలంగాణ మరియు ఆంధ్రప్రదేశ్ అన్ని జిల్లాల వారీగా వధూవరుల ప్రొఫైల్స్ వెతకండి — మన వివాహ.",
  alternates: { canonical: "https://manavivaha.in/districts" },
};

export default function DistrictsPage() {
  return <DistrictsPageClient />;
}
