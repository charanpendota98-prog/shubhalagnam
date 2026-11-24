import type { Metadata } from "next";
import RefundPageClient from "./page-client";

export const metadata: Metadata = {
  title: "రీఫండ్ & రద్దు విధానం (Refund & Cancellation Policy)",
  description: "మన వివాహ రీఫండ్ & రద్దు విధానం — 7 రోజుల్లో పని జరగకపోతే పూర్తి రీఫండ్, డిక్లైన్డ్ క్రెడిట్స్ ఆటోమేటిక్ రీఫండ్.",
  alternates: { canonical: "https://manavivaha.in/refund" },
};

export default function RefundPage() {
  return <RefundPageClient />;
}
