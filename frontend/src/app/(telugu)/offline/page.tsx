import {translateMetadata} from "@/lib/locale-metadata";
import type { Metadata } from "next";
import OfflineClient from "./offline-client";

/** PWA offline fallback — not a searchable destination. */
export const metadata: Metadata = translateMetadata({
  title: "Offline | Mana Vivaha · మన వివాహ",
  robots: { index: false, follow: false },
},"/offline","te");

export default function OfflinePage() {
  return <OfflineClient />;
}
