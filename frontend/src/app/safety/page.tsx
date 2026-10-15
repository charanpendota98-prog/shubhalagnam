import type { Metadata } from "next";
import SafetyPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Safety & Fraud Prevention",
  description: "Read guidance on recognizing and reporting suspicious behavior, protecting personal information, and understanding review indicators.",
  alternates: { canonical: "https://manavivaha.in/safety" },
};

export default function SafetyPage() {
  return <SafetyPageClient />;
}
