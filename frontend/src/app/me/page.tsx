import type { Metadata } from "next";
import MePageClient from "./page-client";

export const metadata: Metadata = {
  title: "My Account & Profile",
  description: "Manage your profile, privacy settings, account requests, and available member tools.",
  alternates: { canonical: "https://manavivaha.in/me" },
  robots: { index: false, follow: false },
};

export default function MePage() {
  return <MePageClient />;
}
