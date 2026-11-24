import type { Metadata } from "next";
import VendorRegister from "./vendor-register-client";

export const metadata: Metadata = {
  title: "Wedding vendor registration",
  description:
    "List your wedding service for Telugu families on Mana Vivaha. Listings are reviewed before they appear, and a listing is not an endorsement or a guarantee of bookings.",
  alternates: { canonical: "https://manavivaha.in/vendors/register" },
};

export default function VendorRegisterPage() {
  return <VendorRegister />;
}
