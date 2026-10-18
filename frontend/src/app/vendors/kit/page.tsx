import type { Metadata } from "next";
import VendorShareKitClient from "./kit-client";

export const metadata: Metadata = {
  title: "Private Vendor Promo Kit | Mana Vivaha · మన వివాహ",
  robots: { index: false, follow: false },
  alternates: { canonical: "/vendors/kit" },
};

export default function VendorShareKitPage() {
  return <VendorShareKitClient />;
}
