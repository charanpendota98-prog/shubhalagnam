import type { Metadata } from "next";

const SITE = process.env.SITE_URL || "https://manavivaha.in";
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const safeId = encodeURIComponent(id || "");
  const canonical = `${SITE}/vendors/${safeId}`;
  try {
    const res = await fetch(`${BACKEND}/api/vendors/${safeId}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      const v = data?.vendor;
      if (v?.business_name) {
        const title = `${v.business_name} — ${v.category_en || v.category || "Wedding Vendor"}`;
        const description =
          (v.about || "").slice(0, 155) ||
          `${v.business_name} (${v.city || v.district || "Telangana & AP"}) — wedding vendor directory listing on Mana Vivaha.`;
        return {
          title,
          description,
          alternates: { canonical },
          openGraph: { title, description, url: canonical, type: "website" },
        };
      }
    }
  } catch {
    /* backend offline during static build — fall back to clean canonical */
  }
  return {
    title: "Wedding Vendor Directory Listing",
    description: "Explore Telugu wedding service vendors across Telangana and Andhra Pradesh on Mana Vivaha.",
    alternates: { canonical },
  };
}

export default function VendorDetailLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
