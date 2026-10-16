import type { Metadata } from "next";
import PartnerRegister from "./partner-register-client";

export const metadata: Metadata = {
  title: "Referral partner registration",
  description:
    "Register as a Mana Vivaha referral partner and share your link with Telugu families. Interest-request credits are not cash, and the separate reward stays conditional until reviewed.",
  alternates: { canonical: "https://manavivaha.in/referral/register" },
};

export default function PartnerRegisterPage() {
  return <PartnerRegister />;
}
