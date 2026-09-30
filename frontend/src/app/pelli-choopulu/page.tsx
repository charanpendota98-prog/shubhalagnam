import { Metadata } from "next";
import PelliChoopuluGuide from "@/components/PelliChoopuluGuide";

export const metadata: Metadata = {
  title: "సాంప్రదాయ పెళ్లి చూపుల మార్గదర్శిని | Pelli Choopulu Guide | మన వివాహ",
  description:
    "మన వివాహ - Complete traditional Telugu Pelli Choopulu customs, etiquette, parent checklist, candidate 1-on-1 questions, and WhatsApp advice cards.",
  alternates: { canonical: "https://manavivaha.in/pelli-choopulu" },
};

export default function PelliChoopuluPage() {
  return <PelliChoopuluGuide />;
}
