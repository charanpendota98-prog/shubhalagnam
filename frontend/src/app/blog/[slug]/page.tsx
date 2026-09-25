import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_ARTICLES, articleBySlug } from "@/lib/blog";

const SITE = (process.env.SITE_URL || "https://manavivaha.in").replace(/\/$/, "");
export const generateStaticParams = () => BLOG_ARTICLES.map(({ slug }) => ({ slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    keywords: article.keywords,
    alternates: { canonical: `/blog/${article.slug}` },
    openGraph: { type: "article", locale: "te_IN", title: article.title, description: article.description,
      url: `${SITE}/blog/${article.slug}`, publishedTime: article.published, modifiedTime: article.updated,
      images: [{ url: "/og-image.png", width: 1200, height: 630 }] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = articleBySlug(slug);
  if (!article) notFound();
  const schema = {
    "@context": "https://schema.org", "@type": "Article", headline: article.title,
    description: article.description, datePublished: article.published, dateModified: article.updated,
    inLanguage: "te-IN", mainEntityOfPage: `${SITE}/blog/${article.slug}`,
    author: { "@type": "Organization", name: "మన వివాహ" },
    publisher: { "@type": "Organization", name: "మన వివాహ", logo: { "@type": "ImageObject", url: `${SITE}/logo.png` } },
  };
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <script type="application/ld+json">
        {JSON.stringify(schema).replace(/</g, "\\u003c")}
      </script>
      <nav className="text-xs text-slate-500" aria-label="Breadcrumb"><Link href="/">హోమ్</Link> / <Link href="/blog">సలహాలు</Link></nav>
      <article className="mt-4 rounded-[2rem] border border-gold/25 bg-white p-5 shadow-sm sm:p-9">
        <header className="border-b border-gold/25 pb-6">
          <p className="text-xs font-bold text-gold-deep">మన వివాహ గైడ్ • {article.readMinutes} నిమిషాలు</p>
          <h1 className="mt-2 text-3xl font-extrabold leading-[1.4] text-maroon telugu sm:text-4xl">{article.title}</h1>
          <p className="mt-4 text-base leading-8 text-slate-700 telugu">{article.intro}</p>
          <p className="mt-3 text-[11px] text-slate-400">Updated: {article.updated}</p>
        </header>
        <div className="mt-7 space-y-9">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl font-extrabold leading-8 text-maroon telugu">{section.heading}</h2>
              {section.paragraphs.map((p) => <p key={p} className="mt-3 text-[15px] leading-8 text-slate-700 telugu">{p}</p>)}
              {section.tips ? <ul className="mt-4 grid gap-2 rounded-2xl bg-amber-50 p-4 sm:grid-cols-2">
                {section.tips.map((tip) => <li key={tip} className="text-sm font-semibold text-slate-700">✓ {tip}</li>)}
              </ul> : null}
            </section>
          ))}
        </div>
        <aside className="mt-10 rounded-2xl bg-maroon p-5 text-center text-white">
          <p className="font-bold telugu">సురక్షితంగా మీ సంబంధం వెతకడం మొదలు పెట్టండి</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Link href="/register" className="rounded-xl bg-gold px-4 py-3 text-sm font-bold text-maroon">ఉచిత నమోదు</Link>
            <Link href="/matches" className="rounded-xl border border-white/40 px-4 py-3 text-sm font-bold">సంబంధాలు చూడండి</Link>
          </div>
        </aside>
      </article>
      <Link href="/blog" className="mt-6 inline-block text-sm font-bold text-maroon">← అన్ని తెలుగు guides</Link>
    </main>
  );
}
