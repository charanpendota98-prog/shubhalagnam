import type { Metadata } from "next";
import TermsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Review the terms governing site use, member responsibilities, platform limitations, and dispute handling.",
  alternates: { canonical: "https://manavivaha.in/terms" },
};

export default function TermsPage() {
  return <TermsPageClient />;
}
