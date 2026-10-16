import type { Metadata } from "next";
import BiodataStudio from "./biodata-client";

export const metadata: Metadata = {
  title: "Free Telugu marriage biodata maker",
  description:
    "Create a printable Telugu marriage biodata from the details you enter. Nothing is stored or published, and no profile is created or matched by using this tool.",
  alternates: { canonical: "https://manavivaha.in/biodata" },
};

export default function BiodataPage() {
  return <BiodataStudio />;
}
