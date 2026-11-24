import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import LoginPageClient from "./page-client";

export const metadata: Metadata = translateMetadata({
  title: "Member Sign In",
  description: "Sign in to your member account using a password or one-time code.",
  alternates: { canonical: "https://manavivaha.in/login" },
  robots: { index: false, follow: false },
},"/login","te");

export default function LoginPage() {
  return <LoginPageClient />;
}
