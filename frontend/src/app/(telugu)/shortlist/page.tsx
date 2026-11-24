import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import ShortlistWorkspace from "@/components/ShortlistWorkspace";

export const metadata: Metadata = translateMetadata({
  title: "My shortlist",
  description:
    "Review the profiles you saved and keep a private note on each. Shortlists and notes are visible only to your account; nothing is shared with the profile owner.",
  alternates: { canonical: "https://manavivaha.in/shortlist" },
  // Account-private surface: nothing here should be indexed or cached publicly.
  robots: { index: false, follow: false },
},"/shortlist","te");

export default function ShortlistPage() {
  return <ShortlistWorkspace />;
}
