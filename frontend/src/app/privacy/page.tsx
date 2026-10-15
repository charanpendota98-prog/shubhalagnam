import type { Metadata } from "next";
import PrivacyPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how personal information, account data, privacy controls, and data requests are handled.",
  alternates: { canonical: "https://manavivaha.in/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
