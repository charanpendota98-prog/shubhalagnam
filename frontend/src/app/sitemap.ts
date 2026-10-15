import type { MetadataRoute } from "next";
import { allSeoSlugs } from "@/lib/seo-pages";
import { BLOG_ARTICLES } from "@/lib/blog";

const SITE = process.env.SITE_URL || "https://manavivaha.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1.0, freq: "daily" },
    { path: "/register", priority: 0.95, freq: "weekly" },
    { path: "/pricing", priority: 0.95, freq: "weekly" },
    { path: "/channels", priority: 0.9, freq: "daily" },
    { path: "/terms", priority: 0.4, freq: "yearly" },
    { path: "/privacy", priority: 0.4, freq: "yearly" },
    { path: "/refund", priority: 0.5, freq: "monthly" },
    // Dynamic search results and member dashboards stay out of the sitemap;
    // only public guides and editorial pages are discovery destinations.

    { path: "/referral", priority: 0.85, freq: "weekly" },
    { path: "/referral/register", priority: 0.6, freq: "monthly" },
    { path: "/vendors", priority: 0.85, freq: "daily" },
    { path: "/vendors/register", priority: 0.7, freq: "weekly" },
    { path: "/bureau", priority: 0.6, freq: "monthly" },
    { path: "/castes", priority: 0.9, freq: "weekly" },
    { path: "/blog", priority: 0.85, freq: "weekly" },
  ];

  const base = routes.map((r) => ({
    url: `${SITE}${r.path}`,
    lastModified: now,
    changeFrequency: r.freq,
    priority: r.priority,
  }));

  // 🔎 Programmatic SEO — caste × role × district landing pages (Google free traffic engine)
  const seo = allSeoSlugs().map((slug) => ({
    url: `${SITE}/castes/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const blog = BLOG_ARTICLES.map((article) => ({
    url: `${SITE}/blog/${article.slug}`,
    lastModified: new Date(article.updated),
    changeFrequency: "monthly" as const,
    priority: 0.78,
  }));

  return [...base, ...seo, ...blog];
}
