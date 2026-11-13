import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Profile Verification — Selfie, Photo, ID, Education & Employment | Mana Vivaha",
  description:
    "How Mana Vivaha records independent profile checks (Live Selfie, Profile Photo moderation, Government ID review, Education, and Employment) without synthetic trust scores.",
  alternates: { canonical: "https://manavivaha.in/verify" },
  robots: { index: true, follow: true },
};

export default function VerifyPage() {
  return (
    <Suspense fallback={null}>
      <VerifyPageClient />
    </Suspense>
  );
}
