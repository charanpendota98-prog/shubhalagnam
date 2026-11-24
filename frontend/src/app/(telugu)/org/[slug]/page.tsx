import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import OrgPortalClient from "./page-client";

const originalMetadata: Metadata = translateMetadata({
  title: "Verified Community Association Portal | Mana Vivaha",
  description:
    "Curated community organization portal displaying approved public profile summaries while keeping contact details strictly owner-controlled.",
},"/org/[slug]","te");

export default function OrgPortalPage() {
  return <OrgPortalClient />;
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return translateMetadata(originalMetadata,"/org/"+encodeURIComponent(slug),"te")}
