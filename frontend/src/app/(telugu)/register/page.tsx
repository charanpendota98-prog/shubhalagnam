import type { Metadata } from "next";
import RegisterPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Create a Free Member Profile",
  description: "Register a Mana Vivaha profile with one required, private-by-default photo. Technical checks and staff review precede visibility; photo review is not identity verification. Three free interest requests are included.",
  alternates: { canonical: "https://manavivaha.in/register" },
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
