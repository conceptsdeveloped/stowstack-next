import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("NOI Calculator");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "NOI Calculator",
    subtitle: "Triangulate net operating income, your expense ratio, and implied value.",
  });
}
