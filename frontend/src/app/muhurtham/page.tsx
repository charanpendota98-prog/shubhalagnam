import type { Metadata } from "next";
import MuhurthamPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Wedding Muhurtham Dates & Times",
  description: "Browse indicative wedding muhurtham dates and times. Confirm the details with a local practitioner before making arrangements.",
  alternates: { canonical: "https://manavivaha.in/muhurtham" },
};

export default function MuhurthamPage() {
  return <MuhurthamPageClient />;
}
