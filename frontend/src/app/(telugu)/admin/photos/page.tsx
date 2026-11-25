import type { Metadata } from "next";
import AdminPhotosClient from "./photos-client";

/**
 * Private moderation queue. The route itself stays reachable for the session
 * holder, but it must never appear in search results, so it is marked noindex
 * rather than left to inherit the site default.
 */
export const metadata: Metadata = {
  title: "Photo review queue | Mana Vivaha · మన వివాహ",
  robots: { index: false, follow: false },
};

export default function AdminPhotosPage() {
  return <AdminPhotosClient />;
}
