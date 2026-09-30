import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyPageClient from "./page-client";

export const metadata: Metadata = {
  title: "ప్రొఫైల్ వెరిఫికేషన్ (Verify with Selfie)",
  description: "లైవ్ సెల్ఫీతో మీ ప్రొఫైల్‌ను వెరిఫై చేసుకుని ట్రస్ట్ బ్యాడ్జ్ పొందండి.",
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
