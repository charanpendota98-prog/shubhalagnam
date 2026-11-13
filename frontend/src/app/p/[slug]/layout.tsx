import type { Metadata } from "next";

const SITE = process.env.SITE_URL || "https://manavivaha.in";
const BACKEND = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const safeSlug = encodeURIComponent(slug || "");
  const canonical = `${SITE}/p/${safeSlug}`;
  try {
    const res = await fetch(`${BACKEND}/api/cms/pages/${safeSlug}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      const page = data?.page;
      if (page?.title_en || page?.title_te) {
        const title = page.title_en || page.title_te;
        const description = String(page.body_en || page.body_te || "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 155) || "Information guide published on Mana Vivaha.";
        return {
          title,
          description,
          alternates: { canonical },
          openGraph: { title, description, url: canonical, type: "article" },
        };
      }
    }
  } catch {
    /* backend offline during build */
  }
  return {
    title: "Information Guide",
    description: "Editorial and community information published on Mana Vivaha.",
    alternates: { canonical },
  };
}

export default function CmsSlugLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
