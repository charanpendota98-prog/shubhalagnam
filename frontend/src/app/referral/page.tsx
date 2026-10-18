import type { Metadata } from "next";
import ReferralDashboard from "./referral-client";

// This route is in the sitemap, so it carries its own title and description
// instead of falling back to the site default.
export const metadata: Metadata = {
  title: "Referral dashboard",
  description:
    "Track your Mana Vivaha referral links, confirmed eligible rewards, payout requests, and share materials. Credits are not cash, and rewards stay conditional until reviewed.",
  alternates: { canonical: "https://manavivaha.in/referral" },
};

export default function ReferralPage() {
  return <ReferralDashboard />;
}
