import type { Metadata } from "next";
import SpotlightPromotionPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Sponsored Profile Placement",
  description: "Apply for a time-limited sponsored profile placement. Payment and profile/media review are required; identity verification, reach, responses, and matches are not guaranteed.",
  alternates: { canonical: "https://manavivaha.in/spotlight" },
};

export default function SpotlightPromotionPage() {
  return <SpotlightPromotionPageClient />;
}
