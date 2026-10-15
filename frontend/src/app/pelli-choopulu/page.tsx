import { Metadata } from "next";
import PelliChoopuluGuide from "@/components/PelliChoopuluGuide";

export const metadata: Metadata = {
  title: "Pelli Choopulu: A Family Introduction Guide",
  description:
    "A practical guide to Telugu Pelli Choopulu customs, family etiquette, questions, and safety considerations.",
  alternates: { canonical: "https://manavivaha.in/pelli-choopulu" },
};

export default function PelliChoopuluPage() {
  return <PelliChoopuluGuide />;
}
