import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { serializeJsonLd } from "@/lib/safe-json-ld";
import { BLOG_ARTICLES, articleBySlug } from "@/lib/blog";
import ArticleContent from "../ArticleContent";

const SITE = (process.env.SITE_URL || "https://manavivaha.in").replace(/\/$/, "");
const LEGACY_CHECKLIST_SLUG = "telugu-pelli-guide-checklist";
const CANONICAL_CHECKLIST_SLUG = "telugu-pelli-sambandham-checklist";
const canonicalSlug = (slug: string) => slug === LEGACY_CHECKLIST_SLUG ? CANONICAL_CHECKLIST_SLUG : slug;
export const generateStaticParams = () => [
  ...BLOG_ARTICLES.map(({ slug }) => ({ slug })),
  { slug: LEGACY_CHECKLIST_SLUG },
];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug(canonicalSlug(slug));
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: {
      type: "article",
      locale: "te_IN",
      title: article.title,
      description: article.description,
      url: `${SITE}/blog/${article.slug}`,
      publishedTime: article.published,
      modifiedTime: article.updated,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resolvedSlug = canonicalSlug(slug);
  if (resolvedSlug !== slug) redirect(`/blog/${resolvedSlug}`);
  const article = articleBySlug(resolvedSlug);
  if (!article) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.published,
    dateModified: article.updated,
    inLanguage: ["te-IN", "en-IN"],
    mainEntityOfPage: `${SITE}/blog/${article.slug}`,
    author: { "@type": "Organization", name: "మన వివాహ (Mana Vivaha)" },
    publisher: {
      "@type": "Organization",
      name: "మన వివాహ (Mana Vivaha)",
      logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }} />
      <ArticleContent article={article} />
    </>
  );
}
