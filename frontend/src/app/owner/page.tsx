import type { Metadata } from "next";
import OwnerPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Owner Dashboard",
  description: "మన వివాహ యజమాని డాష్‌బోర్డ్ — internal use మాత్రమే.",
  alternates: { canonical: "https://manavivaha.in/owner" },
  robots: { index: false, follow: false },
};

export default function OwnerPage() {
  return <OwnerPageClient />;
}
