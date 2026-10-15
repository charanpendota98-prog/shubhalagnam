import type { Metadata } from "next";
import DistrictsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "District-wise Matrimony Directory",
  description: "Browse member-submitted matrimony profiles by district across Telangana and Andhra Pradesh.",
  alternates: { canonical: "https://manavivaha.in/districts" },
};

export default function DistrictsPage() {
  return <DistrictsPageClient />;
}
