import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Profile Verification & Selfie Review",
  description: "Submit a selfie for review. A review status does not establish identity or verify every profile detail.",
  alternates: { canonical: "https://manavivaha.in/verify" },
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPageClient />
    </Suspense>
  );
}
