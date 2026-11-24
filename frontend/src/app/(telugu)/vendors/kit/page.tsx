import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import VendorShareKitClient from "./kit-client";

export const metadata: Metadata = translateMetadata({
  title: "Private Vendor Promo Kit | Mana Vivaha · మన వివాహ",
  robots: { index: false, follow: false },
  alternates: { canonical: "/vendors/kit" },
},"/vendors/kit","te");

export default function VendorShareKitPage() {
  return <VendorShareKitClient />;
}
