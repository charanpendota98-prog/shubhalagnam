import type { Metadata } from "next";

const SITE = process.env.SITE_URL || "https://manavivaha.in";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Member Referral Invitation",
    description: "Join Mana Vivaha through a friend's referral invitation.",
    robots: { index: false, follow: true },
    alternates: { canonical: `${SITE}/register` },
  };
}

export default function ReferralCodeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
