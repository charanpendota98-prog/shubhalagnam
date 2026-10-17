import type { Metadata } from "next";
import VendorCampaignClient from "./campaign-client";

/** Vendor campaign console — partner-only surface, excluded from indexing. */
export const metadata: Metadata = {
  title: "Vendor campaign | Mana Vivaha · మన వివాహ",
  robots: { index: false, follow: false },
};

export default function VendorCampaignPage() {
  return <VendorCampaignClient />;
}
