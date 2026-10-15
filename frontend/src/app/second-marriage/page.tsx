import type { Metadata } from "next";
import SecondMarriagePageClient from "./page-client";

export const metadata: Metadata = {
  title: "Second Marriage & Remarriage Profiles",
  description: "Browse member-submitted profiles for adults considering remarriage. Availability varies, profile details are not independently verified, and outcomes are not guaranteed.",
  alternates: { canonical: "https://manavivaha.in/second-marriage" },
};

export default function SecondMarriagePage() {
  return <SecondMarriagePageClient />;
}
