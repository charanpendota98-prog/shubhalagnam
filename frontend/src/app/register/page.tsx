import type { Metadata } from "next";
import RegisterPageClient from "./page-client";

export const metadata: Metadata = {
  title: "ఉచిత రిజిస్ట్రేషన్ (Register FREE) — 1 నిమిషంలో",
  description: "మన వివాహలో ఉచితంగా నమోదు చేసుకోండి. Phone OTP verification, సభ్యుడు అందించే DOB వివరాలు, photo privacy settings మరియు మొదటి 3 interest requests FREE.",
  alternates: { canonical: "https://manavivaha.in/register" },
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
