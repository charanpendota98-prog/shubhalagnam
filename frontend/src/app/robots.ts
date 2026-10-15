import type { MetadataRoute } from "next";

const SITE = process.env.SITE_URL || "https://manavivaha.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Restricted routes are blocked. Public member/search pages declare noindex
        // in metadata so compliant crawlers can see that instruction.
        disallow: ["/admin", "/admin/photos", "/control", "/growth", "/api/"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
