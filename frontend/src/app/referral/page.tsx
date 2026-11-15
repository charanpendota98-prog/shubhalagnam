import type { Metadata } from "next";
import ReferralDashboard from "./referral-client";

// This route is in the sitemap, so it carries its own title and description
// instead of falling back to the site default.
export const metadata: Metadata = {
  title: "Manavivaha Creator Club",
  description:
    "Join Manavivaha Creator Club. Create campaign links and QR codes, follow badge progress, and track recorded eligible referral rewards. Credits are not cash, and rewards stay conditional until reviewed.",
  alternates: { canonical: "https://manavivaha.in/referral" },
};

export default function ReferralPage() {
  return <ReferralDashboard />;
}
