import type { Metadata } from "next";
import StatusPageClient from "./page-client";

export const metadata: Metadata = {
  title: "System Status & Reliability | Mana Vivaha",
  description:
    "Transparent live status of Mana Vivaha core databases, indexed search projections, provider integrations, and disaster-recovery verification.",
};

export default function StatusPage() {
  return <StatusPageClient />;
}
