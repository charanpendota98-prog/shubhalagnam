import type { Metadata } from "next";
import TermsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "నిబంధనలు & షరతులు (Terms of Use)",
  description: "మన వివాహ వెబ్‌సైట్ వాడకం నిబంధనలు & షరతులు — వినియోగదారుల బాధ్యతలు, వేదిక పాత్ర, వివాద పరిష్కారం.",
  alternates: { canonical: "https://manavivaha.in/terms" },
};

export default function TermsPage() {
  return <TermsPageClient />;
}
