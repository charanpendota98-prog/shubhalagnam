import type { Metadata } from "next";
import RefundPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "Review refund eligibility, including the seven-day unused-credit refund window and the return of eligible request credits after a decline or expiry. Returned credits are not a cash refund.",
  alternates: { canonical: "https://manavivaha.in/refund" },
};

export default function RefundPage() {
  return <RefundPageClient />;
}
