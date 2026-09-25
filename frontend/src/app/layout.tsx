import type { Metadata, Viewport } from "next";
import "./globals.css";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import StickyCTA from "@/components/StickyCTA";
import { CHANNEL_STATS } from "@/lib/channels";
import PWA from "@/components/PWA";
import SupportWidget from "@/components/SupportWidget";
import BackToTop from "@/components/BackToTop";
import LagnaAiAssistant from "@/components/LagnaAiAssistant";
import LiveMatrimonyTicker from "@/components/LiveMatrimonyTicker";
import { LangProvider } from "@/lib/lang";

const SITE = process.env.SITE_URL || "https://manavivaha.in";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "మన వివాహ — Telugu Matrimony | ₹99 Sambandham | First 3 FREE",
    template: "%s | మన వివాహ (Mana Vivaha)",
  },
  description:
`తెలంగాణ మరియు ఆంధ్రప్రదేశ్ తెలుగు వారి పవిత్ర మ్యాట్రిమోనీ. మన వివాహ (Mana Vivaha) — Authentic Vedic Gunamelanam, ${CHANNEL_STATS.total} channels, 43 castes, ₹99 Sambandham, first 3 profiles FREE, photo-private, DOB verified, Telegram + WhatsApp channels. Register in 3 minutes!`,
  keywords: [
    "మన వివాహ", "Mana Vivaha", "Telugu matrimony", "TS matrimony", "AP matrimony", "Reddy matrimony", "Kamma matrimony",
    "Kapu matrimony", "Brahmin matrimony", "Vysya matrimony", "Madiga matrimony", "Lambada matrimony", "Muslim matrimony Telugu",
    "Christian matrimony Telugu", "second marriage Telugu", "₹99 matrimony", "manavivaha",
    "Telangana brides", "Telangana grooms", "Andhra brides", "NRI Telugu matrimony",
  ],
  authors: [{ name: "మన వివాహ (Mana Vivaha)" }],
  applicationName: "మన వివాహ",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "te_IN",
    url: SITE,
    siteName: "మన వివాహ — Telugu Matrimony",
    title: "మన వివాహ — Telugu Matrimony | ₹99 సంబంధం",
    description:
`తెలంగాణ మరియు ఆంధ్రప్రదేశ్ తెలుగు వారి పవిత్ర మ్యాట్రిమోనీ. ${CHANNEL_STATS.total} channels, 43 castes, ₹99 → 5 profiles, first 3 FREE. Photo-private + DOB verified.`,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "మన వివాహ — Telugu Matrimony" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "మన వివాహ — Telugu Matrimony",
    description: `₹99 Sambandham • First 3 FREE • ${CHANNEL_STATS.total} channels • caste-wise`,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
           { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.png"],
  },
  appleWebApp: { capable: true, title: "మన వివాహ", statusBarStyle: "default" },
  formatDetection: { telephone: true },
  category: "Matrimony",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#7A0C2E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="te-IN">
      <body className="antialiased min-h-screen flex flex-col">
        <LangProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <StickyCTA />
          <PWA />
          <LagnaAiAssistant />
          <LiveMatrimonyTicker />
          <SupportWidget />
          <BackToTop />
        </LangProvider>
      </body>
    </html>
  );
}
