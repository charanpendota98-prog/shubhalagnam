import { Metadata } from "next";
import ProfileCompareStudio from "@/components/ProfileCompareStudio";

export const metadata: Metadata = {
  title: "సంబంధాల పోలిక స్టూడియో | Profile Comparison Matrix | మన వివాహ",
  description:
    "మన వివాహ - Compare 2-3 Telugu matrimony profiles side-by-side across Gunamelanam, education, salary, gothram, and horoscope.",
};

export default function ComparePage() {
  return <ProfileCompareStudio />;
}
