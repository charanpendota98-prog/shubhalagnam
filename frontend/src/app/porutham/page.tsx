import type { Metadata } from "next";
import PoruthamPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Vedic Porutham Reference",
  description: "Explore a traditional Porutham reference based on the birth details provided. It is informational and is not a relationship or marriage verdict.",
  alternates: { canonical: "https://manavivaha.in/porutham" },
};

export default function PoruthamPage() {
  return <PoruthamPageClient />;
}
