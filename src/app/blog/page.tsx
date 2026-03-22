import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { getAllPosts, PILLARS } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Operator math, campaign insights, and hard-won lessons from running self-storage facilities and filling them with paid ads.",
};

interface PageProps {
  searchParams: Promise<{ pillar?: string }>;
}

export default async function BlogIndex({ searchParams }: PageProps) {
  const { pillar: activePillar } = await searchParams;
  const allPosts = getAllPosts();
  const filteredPosts = activePillar
    ? allPosts.filter((p) => p.pillar === activePillar)
    : allPosts;
  const featuredPost = filteredPosts.find((p) => p.featured) || filteredPosts[0];
  const remainingPosts = filteredPosts.filter((p) => p.slug !== featuredPost?.slug);

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
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={20} />
          </Link>
          <span className="text-sm font-bold tracking-tight">
            Stow<span style={{ color: "var(--accent)" }}>Stack</span>
          </span>
          <span
            className="text-sm ml-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            / Blog
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <h1
          className="font-bold mb-3"
          style={{
            fontSize: "var(--text-section-head)",
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          Blog
        </h1>
        <p
          className="mb-12"
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-body)",
            maxWidth: "520px",
          }}
        >
          Operator math, campaign insights, and hard-won lessons from running
          self-storage facilities and filling them with paid ads.
        </p>

        {/* Pillar filters */}
        <div className="flex flex-wrap gap-2 mb-12">
          <Link
            href="/blog"
            className="text-xs px-3 py-1.5 rounded-full transition-colors"
            style={{
              background: !activePillar ? "var(--accent)" : "var(--bg-elevated)",
              color: !activePillar ? "#fff" : "var(--text-secondary)",
              border: !activePillar ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
            }}
          >
            All
          </Link>
          {Object.entries(PILLARS).map(([key, pillar]) => (
            <Link
              key={key}
              href={`/blog?pillar=${key}`}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: activePillar === key ? "var(--accent)" : "var(--bg-elevated)",
                color: activePillar === key ? "#fff" : "var(--text-secondary)",
                border: activePillar === key ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
              }}
            >
              {pillar.label}
            </Link>
          ))}
        </div>

        {/* Featured */}
        {featuredPost && (
          <Link
            href={`/blog/${featuredPost.slug}`}
            className="block rounded-lg p-8 mb-12 transition-colors group"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <span
              className="text-xs font-semibold uppercase mb-4 block"
              style={{
                color: "var(--accent)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              Featured
            </span>
            <h2
              className="font-bold mb-3 group-hover:opacity-80 transition-opacity"
              style={{
                fontSize: "var(--text-subhead)",
                lineHeight: "var(--leading-snug)",
              }}
            >
              {featuredPost.title}
            </h2>
            <p
              className="mb-4"
              style={{
                color: "var(--text-secondary)",
                fontSize: "var(--text-body)",
                maxWidth: "600px",
              }}
            >
              {featuredPost.description}
            </p>
            <div
              className="flex items-center gap-4 text-xs"
              style={{ color: "var(--text-tertiary)" }}
            >
              <span>
                {PILLARS[featuredPost.pillar]?.label || featuredPost.pillar}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {featuredPost.readingTime} min read
              </span>
              <span>·</span>
              <span>{featuredPost.date}</span>
            </div>
          </Link>
        )}

        {/* All posts */}
        {filteredPosts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
              No posts found in this category.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {remainingPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="flex items-start justify-between gap-6 py-6 group border-b"
                style={{ borderColor: "var(--border-subtle)" }}
              >
                <div className="flex-1 min-w-0">
                  <h3
                    className="font-semibold mb-1 group-hover:opacity-80 transition-opacity"
                    style={{ fontSize: "var(--text-body)" }}
                  >
                    {post.title}
                  </h3>
                  <p
                    className="text-sm line-clamp-2"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {post.description}
                  </p>
                  <div
                    className="flex items-center gap-3 mt-2 text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    <span>
                      {PILLARS[post.pillar]?.label || post.pillar}
                    </span>
                    <span>·</span>
                    <span>{post.readingTime} min</span>
                    <span>·</span>
                    <span>{post.date}</span>
                  </div>
                </div>
                <ArrowRight
                  size={16}
                  className="flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--text-tertiary)" }}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
