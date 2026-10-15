import type { Metadata } from "next";
import BureauPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Marriage Bureau & Agent Plans",
  description: "Review request-credit plans for marriage bureaus and agents. These plans do not include bulk registration, monthly reports, or channel posting.",
  alternates: { canonical: "https://manavivaha.in/bureau" },
};

export default function BureauPage() {
  return <BureauPageClient />;
}
