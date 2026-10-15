/**
 * /castes — selected community hubs with links to available channels and matches.
 * The directory is not an exhaustive or official community classification.
 */
import type { Metadata } from "next";
import CastesClient from "./castes-client";

export const metadata: Metadata = {
  title: "Telugu Community Matrimony Directory | Mana Vivaha",
  description:
    "Browse selected Telugu community matrimony hubs, available profiles and listed channels. Community labels are not exhaustive; self-described names are supported during registration. Mana Vivaha (మన వివాహ).",
  keywords: ["caste wise matrimony", "telugu caste matrimony", "reddy matrimony", "kamma matrimony",
             "mala matrimony", "madiga matrimony", "lambada matrimony", "tsap matrimony"],
  alternates: { canonical: "https://manavivaha.in/castes" },
};

export default function CastesHub() {
  return <CastesClient />;
}
