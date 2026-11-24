import type { Metadata } from "next";
import ElderReviewClient from "./page-client";

export const metadata: Metadata = {
  title: "Private Family Biodata Review",
  description: "Owner-shared private biodata review link on Mana Vivaha.",
  robots: { index: false, follow: false },
};

export default function ElderReviewPage() {
  return <ElderReviewClient />;
}
