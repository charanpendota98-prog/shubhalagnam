import type { Metadata } from "next";
import PricingPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Pricing & Plans — From ₹99",
  description: "Review current plans starting at ₹99. Free registration includes the first three interest requests; add-ons and sponsored services are separate. Contact access follows profile-owner acceptance.",
  alternates: { canonical: "https://manavivaha.in/pricing" },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
