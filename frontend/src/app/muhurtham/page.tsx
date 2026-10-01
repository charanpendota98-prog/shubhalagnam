import type { Metadata } from "next";
import MuhurthamPageClient from "./page-client";

export const metadata: Metadata = {
  title: "వివాహ ముహూర్తాలు 2026-2027 (Vivaha Muhurthams)",
  description: "వేద పంచాంగం ప్రకారం 2026-2027 శుభ వివాహ ముహూర్తాలు, లగ్నాలు, నక్షత్రాలు — నెలవారీగా, WhatsApp షేర్ & ప్రింట్ చేసుకోండి.",
  alternates: { canonical: "https://manavivaha.in/muhurtham" },
};

export default function MuhurthamPage() {
  return <MuhurthamPageClient />;
}
