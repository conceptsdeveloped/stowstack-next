import React from "react";

interface MarkdownNode {
  type: string;
  content?: string;
  children?: MarkdownNode[];
  level?: number;
  items?: MarkdownNode[];
  ordered?: boolean;
}

function parseMarkdown(text: string): MarkdownNode[] {
  const lines = text.split("\n");
  const nodes: MarkdownNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      nodes.push({
        type: "heading",
        level: headingMatch[1].length,
        content: headingMatch[2],
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      nodes.push({ type: "blockquote", content: quoteLines.join("\n") });
      continue;
    }

    // Unordered list
    if (line.match(/^[-*]\s/)) {
      const items: MarkdownNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) {
        items.push({
          type: "list-item",
          content: lines[i].replace(/^[-*]\s/, ""),
        });
        i++;
      }
      nodes.push({ type: "list", ordered: false, items });
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const items: MarkdownNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        items.push({
          type: "list-item",
          content: lines[i].replace(/^\d+\.\s/, ""),
        });
        i++;
      }
      nodes.push({ type: "list", ordered: true, items });
      continue;
    }

    // Paragraph (collect consecutive non-empty lines)
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith(">") &&
      !lines[i].match(/^[-*]\s/) &&
      !lines[i].match(/^\d+\.\s/)
    ) {
      pLines.push(lines[i]);
      i++;
    }
    if (pLines.length > 0) {
      nodes.push({ type: "paragraph", content: pLines.join(" ") });
    }
  }

  return nodes;
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(remaining.slice(0, boldMatch.index));
      }
      parts.push(
        <strong key={key++} style={{ color: "var(--text-primary)" }}>
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Link
    const linkMatch = remaining.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch && linkMatch.index !== undefined) {
      if (linkMatch.index > 0) {
        parts.push(remaining.slice(0, linkMatch.index));
      }
      parts.push(
        <a
          key={key++}
          href={linkMatch[2]}
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          {linkMatch[1]}
        </a>
      );
      remaining = remaining.slice(linkMatch.index + linkMatch[0].length);
      continue;
    }

    parts.push(remaining);
    break;
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export function MarkdownRenderer({ content }: { content: string }) {
  const nodes = parseMarkdown(content);

  return (
    <div className="blog-content">
      {nodes.map((node, i) => {
        switch (node.type) {
          case "heading": {
            const Tag = `h${node.level}` as keyof React.JSX.IntrinsicElements;
            return (
              <Tag key={i} className={`blog-h${node.level}`}>
                {renderInline(node.content || "")}
              </Tag>
            );
          }
          case "paragraph":
            return <p key={i}>{renderInline(node.content || "")}</p>;
          case "blockquote":
            return (
              <blockquote key={i}>
                {renderInline(node.content || "")}
              </blockquote>
            );
          case "list": {
            const ListTag = node.ordered ? "ol" : "ul";
            return (
              <ListTag key={i}>
                {node.items?.map((item, j) => (
                  <li key={j}>{renderInline(item.content || "")}</li>
                ))}
              </ListTag>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
