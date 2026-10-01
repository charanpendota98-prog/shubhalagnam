import type { Metadata } from "next";
import LoginPageClient from "./page-client";

export const metadata: Metadata = {
  title: "సభ్యుల లాగిన్ (Member Login)",
  description: "మన వివాహ ఖాతాలోకి లాగిన్ అవ్వండి — పాస్‌వర్డ్ లేదా OTP ద్వారా.",
  alternates: { canonical: "https://manavivaha.in/login" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
