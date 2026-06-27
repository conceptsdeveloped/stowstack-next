import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("DSCR & Loan Sizing");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "DSCR & Loan Sizing",
    subtitle: "The loan your NOI supports, and the DSCR on a loan you're weighing.",
  });
}
