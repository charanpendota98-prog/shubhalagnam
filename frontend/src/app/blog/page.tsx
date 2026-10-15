import type { Metadata } from "next";
import BlogIndex from "./BlogIndex";

export const metadata: Metadata = {
  title: "Telugu Matrimony Advice & Guides",
  description: "Practical guides to writing a profile, reviewing introductions, online safety, and family conversations.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return <BlogIndex />;
}
