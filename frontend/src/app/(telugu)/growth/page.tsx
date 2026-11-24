import type { Metadata } from "next";
import GrowthClient from "./growth-client";

/** Internal ops dashboard — excluded from search indexing. */
export const metadata: Metadata = {
  title: "Ops overview | Mana Vivaha · మన వివాహ",
  robots: { index: false, follow: false },
};

export default function GrowthPage() {
  return <GrowthClient />;
}
