import type { Metadata } from "next";
import StoriesClient from "./stories-client";

export const metadata: Metadata = {
  title: "Member Stories",
  description:
    "Members may submit a story about their Mana Vivaha experience. Stories appear after review when available. Registration includes three free interest requests; paid plans start at ₹99.",
  alternates: { canonical: "https://manavivaha.in/stories" },
};

export default function StoriesPage() {
  return <StoriesClient />;
}
