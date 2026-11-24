import type { Metadata } from "next";
import VendorsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Wedding Vendor Directory",
  description: "Browse listed businesses offering wedding-related services, including catering, photography, venues, decor, and more.",
  alternates: { canonical: "https://manavivaha.in/vendors" },
};

export default function VendorsPage() {
  return <VendorsPageClient />;
}
