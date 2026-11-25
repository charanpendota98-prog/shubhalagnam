import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import BureauPageClient from "./page-client";

export const metadata: Metadata = translateMetadata({
  title: "Marriage Bureau & Agent Plans",
  description: "Review request-credit plans for marriage bureaus and agents. These plans do not include bulk registration, monthly reports, or channel posting.",
  alternates: { canonical: "https://manavivaha.in/bureau" },
},"/bureau","te");

export default function BureauPage() {
  return <BureauPageClient />;
}
