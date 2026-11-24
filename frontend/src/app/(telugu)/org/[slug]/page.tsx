import type { Metadata } from "next";
import OrgPortalClient from "./page-client";

export const metadata: Metadata = {
  title: "Verified Community Association Portal | Mana Vivaha",
  description:
    "Curated community organization portal displaying approved public profile summaries while keeping contact details strictly owner-controlled.",
};

export default function OrgPortalPage() {
  return <OrgPortalClient />;
}
