import {translateMetadata} from "@/lib/locale-metadata";
import { Metadata } from "next";
import ProfileCompareStudio from "@/components/ProfileCompareStudio";

export const metadata: Metadata = translateMetadata({
  title: "Profile Comparison Studio",
  description:
    "Compare selected member-provided profile details side by side. Traditional references are informational and do not produce a compatibility verdict.",
  alternates: { canonical: "https://manavivaha.in/compare" },
},"/compare","te");

export default function ComparePage() {
  return <ProfileCompareStudio />;
}
