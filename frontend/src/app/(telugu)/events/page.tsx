import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import EventsPageClient from "./page-client";

export const metadata: Metadata = translateMetadata({
  title: "Community Events, Wedding Bundles & Portals | Mana Vivaha",
  description:
    "Verified Parichaya Vedika gatherings, consented RSVPs, structured wedding service bundles, organization portals, and k-anonymous community insights.",
},"/events","te");

export default function EventsPage() {
  return <EventsPageClient />;
}
