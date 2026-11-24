import type { Metadata } from "next";
import PrivacyPageClient from "./page-client";

export const metadata: Metadata = {
  title: "గోప్యతా విధానం (Privacy Policy)",
  description: "మన వివాహ గోప్యతా విధానం — DPDP Act 2023 ప్రకారం మీ డేటా ఎలా సురక్షితంగా ఉంచుతామో వివరంగా చదవండి.",
  alternates: { canonical: "https://manavivaha.in/privacy" },
};

export default function PrivacyPage() {
  return <PrivacyPageClient />;
}
