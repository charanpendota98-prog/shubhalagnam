import type { Metadata } from "next";
import SecondMarriagePageClient from "./page-client";

export const metadata: Metadata = {
  title: "రెండో వివాహం సంబంధాలు (Second Marriage / Remarriage)",
  description: "విడాకులు తీసుకున్న, వితంతు/వితంతువులైన వధూవరుల కోసం ప్రత్యేక Second Marriage విభాగం — గౌరవప్రదమైన, consent-based సంబంధాలు.",
  alternates: { canonical: "https://manavivaha.in/second-marriage" },
};

export default function SecondMarriagePage() {
  return <SecondMarriagePageClient />;
}
