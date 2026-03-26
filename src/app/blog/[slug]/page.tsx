import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import {
  getAllPosts,
  getPostBySlug,
  getAdjacentPosts,
  getAuthor,
  PILLARS,
} from "@/lib/blog";
import { MarkdownRenderer } from "@/lib/markdown";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Not Found" };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://storageads.com";
  const postUrl = `${siteUrl}/blog/${slug}`;
  const author = getAuthor();

  return {
    title: `${post.title} — StorageAds Blog`,
    description: post.description,
    keywords: post.tags,
    authors: author ? [{ name: author.name }] : undefined,
    openGraph: {
      title: post.title,
      description: post.description,
      url: postUrl,
      siteName: "StorageAds",
      type: "article",
      publishedTime: post.date,
      authors: author ? [author.name] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: postUrl,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const { prev, next } = getAdjacentPosts(slug);
  const author = getAuthor();
  const pillar = PILLARS[post.pillar];

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}
    >
      {/* Nav */}
      <header
        className="sticky top-0 z-[100] border-b"
        style={{
          background: "var(--bg-void)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/blog"
            className="p-2 -ml-2 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={20} />
          </Link>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, letterSpacing: "-0.5px" }}>
            <span style={{ color: "var(--color-dark)" }}>storage</span><span style={{ color: "var(--color-gold)" }}>ads</span>
          </span>
          <span
            className="text-sm ml-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            / Blog
          </span>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Meta */}
        <div
          className="flex flex-wrap items-center gap-3 mb-6 text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          {pillar && (
            <span
              className="px-2.5 py-1 rounded-full"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--accent)",
              }}
            >
              {pillar.label}
            </span>
          )}
          <span>{post.date}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {post.readingTime} min read
          </span>
        </div>

        {/* Title */}
        <h1
          className="font-bold mb-6"
          style={{
            fontSize: "var(--text-section-head)",
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          {post.title}
        </h1>

        {/* Description */}
        <p
          className="mb-10"
          style={{
            fontSize: "var(--text-subhead)",
            color: "var(--text-secondary)",
            lineHeight: "var(--leading-snug)",
          }}
        >
          {post.description}
        </p>

        {/* Author */}
        <div
          className="flex items-center gap-3 mb-12 pb-8 border-b"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--accent)",
            }}
          >
            {author.name[0]}
          </div>
          <div>
            <div className="text-sm font-medium">{author.name}</div>
            <div
              className="text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              {author.role}
            </div>
          </div>
        </div>

        {/* Content */}
        <MarkdownRenderer content={post.content} />

        {/* Tags + Share */}
        <div
          className="mt-12 pt-8 border-t flex items-start justify-between gap-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full"
                  style={{
                    background: "var(--bg-elevated)",
                    color: "var(--text-tertiary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs mr-1" style={{ color: "var(--text-tertiary)" }}>
              Share
            </span>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://storageads.com/blog/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ background: "var(--bg-elevated)" }}
              aria-label="Share on X"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-secondary)" }}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://storageads.com/blog/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ background: "var(--bg-elevated)" }}
              aria-label="Share on LinkedIn"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-secondary)" }}>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://storageads.com/blog/${post.slug}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ background: "var(--bg-elevated)" }}
              aria-label="Share on Facebook"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ color: "var(--text-secondary)" }}>
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="mt-12 pt-8 border-t grid grid-cols-2 gap-4"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          {prev ? (
            <Link
              href={`/blog/${prev.slug}`}
              className="group"
            >
              <span
                className="text-xs flex items-center gap-1 mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                <ArrowLeft size={12} />
                Previous
              </span>
              <span
                className="text-sm font-medium group-hover:opacity-80 transition-opacity line-clamp-2"
              >
                {prev.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={`/blog/${next.slug}`}
              className="text-right group"
            >
              <span
                className="text-xs flex items-center justify-end gap-1 mb-1"
                style={{ color: "var(--text-tertiary)" }}
              >
                Next
                <ArrowRight size={12} />
              </span>
              <span
                className="text-sm font-medium group-hover:opacity-80 transition-opacity line-clamp-2"
              >
                {next.title}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </nav>
      </article>
    </div>
  );
}
