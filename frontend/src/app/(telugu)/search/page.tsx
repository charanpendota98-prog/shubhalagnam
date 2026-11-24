import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import SearchIndexPageClient from "./page-client";

export const metadata: Metadata = translateMetadata({
  title: "Search by Profile ID",
  description: "Look up an existing member profile by its ID. Availability depends on profile privacy and account settings.",
  alternates: { canonical: "https://manavivaha.in/search" },
},"/search","te");

export default function SearchIndexPage() {
  return <SearchIndexPageClient />;
}
