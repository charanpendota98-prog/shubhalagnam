import type { Metadata } from "next";
import VendorsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "వెడ్డింగ్ వెండర్స్ డైరెక్టరీ (Catering, Photography, Decor)",
  description: "పెళ్లి సంబంధిత వెండర్స్ — క్యాటరింగ్, ఫోటోగ్రఫీ, డెకరేషన్, హాల్, పండిట్, మేకప్ — 18 కేటగిరీలలో డైరెక్టరీ & ప్రమోషన్.",
  alternates: { canonical: "https://manavivaha.in/vendors" },
};

export default function VendorsPage() {
  return <VendorsPageClient />;
}
