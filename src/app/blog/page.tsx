import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllPosts, PILLARS } from "@/lib/blog";
import {
  buildSearchText,
  type BlogListItem,
  type SortKey,
} from "@/lib/blog-filter";
import { BlogExplorer } from "@/components/blog/blog-explorer";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Operator math, campaign insights, and hard-won lessons from running self-storage facilities and filling them with paid ads.",
  openGraph: {
    title: "Blog — StorageAds",
    description:
      "Operator math, campaign insights, and hard-won lessons from running self-storage facilities and filling them with paid ads.",
    url: "https://storageads.com/blog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog — StorageAds",
    description:
      "Operator math, campaign insights, and hard-won lessons from self-storage marketing.",
  },
};

interface PageProps {
  searchParams: Promise<{
    pillar?: string;
    q?: string;
    sort?: string;
    tags?: string;
  }>;
}

const VALID_SORTS: SortKey[] = ["newest", "oldest", "shortest", "longest", "az"];

export default async function BlogIndex({ searchParams }: PageProps) {
  const sp = await searchParams;

  const posts: BlogListItem[] = getAllPosts().map((p) => {
    const pillarLabel = PILLARS[p.pillar]?.label ?? p.pillar;
    return {
      slug: p.slug,
      title: p.title,
      description: p.description,
      pillar: p.pillar,
      pillarLabel,
      tags: p.tags,
      date: p.date,
      readingTime: p.readingTime,
      featured: p.featured,
      searchText: buildSearchText(p.title, p.description, p.tags, pillarLabel),
    };
  });

  const pillars = Object.entries(PILLARS).map(([key, p]) => ({
    key,
    label: p.label,
  }));

  const initialPillar =
    sp.pillar && PILLARS[sp.pillar] ? sp.pillar : null;
  const initialSort: SortKey =
    sp.sort && (VALID_SORTS as string[]).includes(sp.sort)
      ? (sp.sort as SortKey)
      : "newest";
  const initialTags = sp.tags
    ? sp.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}
    >
      {/* Nav */}
      <header
        className="sticky top-0 z-[100] border-b"
        style={{ background: "var(--bg-void)", borderColor: "var(--border-subtle)" }}
      >
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft size={20} />
          </Link>
          <span style={{ fontFamily: "var(--font-heading)", fontWeight: 600, letterSpacing: "-0.5px" }}>
            <span style={{ color: "var(--color-dark)" }}>storage</span>
            <span style={{ color: "var(--color-gold)" }}>ads</span>
          </span>
          <span className="text-sm ml-2" style={{ color: "var(--text-tertiary)" }}>
            / Blog
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <h1
          className="font-semibold mb-3"
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

        <BlogExplorer
          posts={posts}
          pillars={pillars}
          initialPillar={initialPillar}
          initialQuery={sp.q ?? ""}
          initialSort={initialSort}
          initialTags={initialTags}
        />
      </div>
    </div>
  );
}
