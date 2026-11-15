import type { Metadata } from "next";
import { loadPricingSnapshot } from "@/lib/pricing-snapshot.mjs";
import PricingPageClient, { type PricingSnapshot } from "./page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing & Plans — From ₹99",
  description: "Review current plans starting at ₹99. Free registration includes the first three interest requests; add-ons and sponsored services are separate. Contact access follows profile-owner acceptance.",
  alternates: { canonical: "https://manavivaha.in/pricing" },
};

export default async function PricingPage() {
  const snapshot: PricingSnapshot = await loadPricingSnapshot(process.env.BACKEND_URL || "http://localhost:8000");
  return <PricingPageClient snapshot={snapshot} />;
}
