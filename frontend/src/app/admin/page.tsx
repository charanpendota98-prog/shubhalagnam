import type { Metadata } from "next";
import Dashboard from "@/components/control/Dashboard";

/** Compatibility route for the session-authenticated control dashboard. */
export const metadata: Metadata = {
  title: "Control dashboard | Mana Vivaha · మన వివాహ",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <Dashboard />;
}
