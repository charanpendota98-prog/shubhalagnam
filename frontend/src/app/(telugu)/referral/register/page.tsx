import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import PartnerRegister from "./partner-register-client";

export const metadata: Metadata = translateMetadata({
  title: "Join Manavivaha Creator Club",
  description:
    "Join Manavivaha Creator Club as a referral partner and share your link with Telugu families. Interest-request credits are not cash, and the separate reward stays conditional until reviewed.",
  alternates: { canonical: "https://manavivaha.in/referral/register" },
},"/referral/register","te");

export default function PartnerRegisterPage() {
  return <PartnerRegister />;
}
