import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import VendorCampaignClient from "./campaign-client";

/** Vendor campaign console — partner-only surface, excluded from indexing. */
export const metadata: Metadata = translateMetadata({
  title: "Vendor campaign | Mana Vivaha · మన వివాహ",
  robots: { index: false, follow: false },
},"/vendors/campaign","te");

export default function VendorCampaignPage() {
  return <VendorCampaignClient />;
}
