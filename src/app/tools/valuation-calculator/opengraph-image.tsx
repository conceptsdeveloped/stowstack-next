import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("Valuation & Cap Rate");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "Valuation & Cap Rate",
    subtitle: "Solve for value, cap rate, or NOI from the other two.",
  });
}
