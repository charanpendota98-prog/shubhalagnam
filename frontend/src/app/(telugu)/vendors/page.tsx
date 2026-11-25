import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import VendorsPageClient from "./page-client";

export const metadata: Metadata = translateMetadata({
  title: "Wedding Vendor Directory",
  description: "Browse listed businesses offering wedding-related services, including catering, photography, venues, decor, and more.",
  alternates: { canonical: "https://manavivaha.in/vendors" },
},"/vendors","te");

export default function VendorsPage() {
  return <VendorsPageClient />;
}
