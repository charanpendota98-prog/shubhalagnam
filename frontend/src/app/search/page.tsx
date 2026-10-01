import type { Metadata } from "next";
import SearchIndexPageClient from "./page-client";

export const metadata: Metadata = {
  title: "ప్రొఫైల్ ID తో వెతకండి (Search by Profile ID)",
  description: "మీ దగ్గర ఉన్న Profile ID (ఉదా: MV1001) తో నేరుగా ఆ వ్యక్తి పూర్తి వివరాలు చూడండి — మన వివాహ.",
  alternates: { canonical: "https://manavivaha.in/search" },
};

export default function SearchIndexPage() {
  return <SearchIndexPageClient />;
}
