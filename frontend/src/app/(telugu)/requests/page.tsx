import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import RequestsPageClient from "./page-client";

export const metadata: Metadata = translateMetadata({
  title: "Interest Requests Dashboard",
  description: "Review and manage the interest requests you have sent and received.",
  alternates: { canonical: "https://manavivaha.in/requests" },
  robots: { index: false, follow: false },
},"/requests","te");

export default function RequestsPage() {
  return <RequestsPageClient />;
}
