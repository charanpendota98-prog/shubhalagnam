import type { Metadata } from "next";

const SITE = process.env.SITE_URL || "https://manavivaha.in";

async function originalMetadata(): Promise<Metadata> {
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

import {translateMetadata} from "@/lib/locale-metadata";
export async function generateMetadata({params}:{params:Promise<{code:string}>}){const p=await params;return translateMetadata(await originalMetadata(),"/r/"+encodeURIComponent(p.code),"te");}
