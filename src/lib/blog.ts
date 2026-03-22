import fs from "fs";
import path from "path";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  pillar: string;
  description: string;
  author: string;
  tags: string[];
  featured: boolean;
  draft: boolean;
  heroAlt?: string;
  readingTime: number;
  content: string;
}

export interface Author {
  name: string;
  role: string;
  bio: string;
  avatar: string;
  linkedin: string;
  twitter: string;
}

export const PILLARS: Record<string, { label: string; description: string }> = {
  "operator-math": {
    label: "Operator Math",
    description:
      "Unit economics, attribution models, and the numbers that actually drive self-storage profitability.",
  },
  "whats-working": {
    label: "What's Working",
    description:
      "Real tests, real data, real results from campaigns and strategies in the field.",
  },
  "operators-edge": {
    label: "Operator's Edge",
    description:
      "Operational insights and hard-won lessons from running self-storage facilities day to day.",
  },
  "industry-takes": {
    label: "Industry Takes",
    description:
      "Analysis of market trends, REIT earnings, and what they mean for independent operators.",
  },
};

function parseFrontmatter(raw: string): {
  data: Record<string, unknown>;
  content: string;
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: raw };

  const yamlStr = match[1];
  const content = match[2];
  const data: Record<string, unknown> = {};

  for (const line of yamlStr.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let val: string | boolean | string[] = trimmed.slice(colonIdx + 1).trim();

    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    } else if (val.startsWith("[") && val.endsWith("]")) {
      val = val
        .slice(1, -1)
        .split(",")
        .map((s: string) => {
          const t = s.trim();
          return (t.startsWith('"') && t.endsWith('"')) ||
            (t.startsWith("'") && t.endsWith("'"))
            ? t.slice(1, -1)
            : t;
        });
    } else if (val === "true") val = true;
    else if (val === "false") val = false;

    data[key] = val;
  }

  return { data, content };
}

function getReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 250));
}

let _posts: BlogPost[] | null = null;

export function getAllPosts(): BlogPost[] {
  if (_posts) return _posts;

  const blogDir = path.join(process.cwd(), "content/blog");
  if (!fs.existsSync(blogDir)) return [];

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith(".md"));
  const posts: BlogPost[] = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(blogDir, file), "utf-8");
    const { data, content } = parseFrontmatter(raw);
    if (data.draft) continue;

    posts.push({
      slug: (data.slug as string) || file.replace(".md", ""),
      title: data.title as string,
      date: String(data.date),
      pillar: data.pillar as string,
      description: data.description as string,
      author: (data.author as string) || "Blake",
      tags: (data.tags as string[]) || [],
      featured: (data.featured as boolean) || false,
      draft: false,
      heroAlt: data.heroAlt as string | undefined,
      readingTime: getReadingTime(content),
      content,
    });
  }

  posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  _posts = posts;
  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

export function getPostsByPillar(pillar: string): BlogPost[] {
  return getAllPosts().filter((p) => p.pillar === pillar);
}

export function getAdjacentPosts(slug: string): {
  prev?: BlogPost;
  next?: BlogPost;
} {
  const posts = getAllPosts();
  const idx = posts.findIndex((p) => p.slug === slug);
  return {
    prev: idx < posts.length - 1 ? posts[idx + 1] : undefined,
    next: idx > 0 ? posts[idx - 1] : undefined,
  };
}

export function getAuthor(): Author {
  const authorPath = path.join(process.cwd(), "content/authors/default.json");
  if (fs.existsSync(authorPath)) {
    return JSON.parse(fs.readFileSync(authorPath, "utf-8"));
  }
  return {
    name: "Blake",
    role: "Founder, StowStack — Self-Storage Operator",
    bio: "Runs self-storage facilities and built StowStack to solve the marketing attribution problem he lived every day.",
    avatar: "",
    linkedin: "",
    twitter: "",
  };
}
