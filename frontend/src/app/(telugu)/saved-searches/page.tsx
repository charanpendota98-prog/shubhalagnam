import type { Metadata } from "next";
import SavedSearchWorkspace from "@/components/SavedSearchWorkspace";

export const metadata: Metadata = {
  title: "Saved searches & alerts",
  description:
    "Manage the searches you saved, see what is new for each, and control WhatsApp alerts. Alerts are optional and can be turned off at any time.",
  alternates: { canonical: "https://manavivaha.in/saved-searches" },
  // Account-private surface: nothing here should be indexed or cached publicly.
  robots: { index: false, follow: false },
};

export default function SavedSearchesPage() {
  return <SavedSearchWorkspace />;
}
