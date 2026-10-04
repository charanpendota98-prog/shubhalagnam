import type { Metadata } from "next";
import ChannelsPageClient from "./page-client";

export const metadata: Metadata = {
  title: "Channel Directory — Telegram & WhatsApp | Mana Vivaha",
  description: "Explore 52 Mana Vivaha directory listings across regional, religion, caste and special categories. Telegram and configured WhatsApp links are shown where available; external availability and post delivery are not guaranteed.",
  alternates: { canonical: "/channels" },
};

export default function ChannelsPage() {
  return <ChannelsPageClient />;
}
