import type { Metadata } from "next";
import MatchesPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Matrimony Matches & Profile Search",
  description: "Search member-submitted profiles using available community, district, education, work, and traditional-reference filters. Profile details are not independently verified.",
  alternates: { canonical: "https://manavivaha.in/matches" },
  // Filter state and member results are dynamic; keep this utility page out of the index.
  robots: { index: false, follow: false },
};

export default function MatchesPage() {
  return <MatchesPageClient />;
}
