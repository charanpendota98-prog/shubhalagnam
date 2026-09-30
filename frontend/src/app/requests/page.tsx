import type { Metadata } from "next";
import RequestsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "ఇంట్రెస్ట్ రిక్వెస్ట్స్ (Requests Dashboard)",
  description: "మీకు వచ్చిన & మీరు పంపిన ఇంట్రెస్ట్ రిక్వెస్ట్‌లను ఇక్కడ చూసుకోండి, Accept/Decline చేయండి.",
  alternates: { canonical: "https://manavivaha.in/requests" },
  robots: { index: false, follow: false },
};

export default function RequestsPage() {
  return <RequestsPageClient />;
}
