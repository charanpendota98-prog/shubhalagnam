import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import StatusPageClient from "./page-client";

export const metadata: Metadata = translateMetadata({
  title: "System Status & Reliability | Mana Vivaha",
  description:
    "Transparent live status of Mana Vivaha core databases, indexed search projections, provider integrations, and disaster-recovery verification.",
},"/status","te");

export default function StatusPage() {
  return <StatusPageClient />;
}
