import type { Metadata } from "next";
import RegisterPageClient from "./page-client";

export const metadata: Metadata = {
  title: "ఉచిత రిజిస్ట్రేషన్ (Register FREE) — 1 నిమిషంలో",
  description: "మన వివాహలో 1 నిమిషంలో ఉచిత రిజిస్ట్రేషన్ చేసుకోండి. DOB verified, photo-private profiles, మొదటి 3 ఇంట్రెస్ట్ రిక్వెస్ట్స్ FREE.",
  alternates: { canonical: "https://manavivaha.in/register" },
};

export default function RegisterPage() {
  return <RegisterPageClient />;
}
