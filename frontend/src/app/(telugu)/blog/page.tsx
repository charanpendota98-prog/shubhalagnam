import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import BlogIndex from "./BlogIndex";

export const metadata: Metadata = translateMetadata({
  title: "Telugu Matrimony Advice & Guides",
  description: "Practical guides to writing a profile, reviewing introductions, online safety, and family conversations.",
  alternates: { canonical: "/blog" },
},"/blog","te");

export default function BlogPage() {
  return <BlogIndex />;
}
