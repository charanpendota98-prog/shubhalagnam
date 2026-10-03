import type { Metadata } from "next";
import ChannelsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "కుల & మత వారీగా ఛానెల్స్ — Telegram + WhatsApp",
  description: "మన వివాహ 42 Hindu Telegram & WhatsApp ఛానెల్స్ — Region, Hindu caste-wise (27 కుల-వారీ ఛానెల్స్), Special channels. మీ ప్రొఫైల్ సరైన ఛానెల్‌లో పోస్ట్ అవుతుంది.",
  alternates: { canonical: "https://manavivaha.in/channels" },
};

export default function ChannelsPage() {
  return <ChannelsPageClient />;
}
