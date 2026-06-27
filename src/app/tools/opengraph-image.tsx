import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("Free tools for storage operators");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "Free tools for storage operators",
    subtitle: "NOI, valuation, DSCR, lease-up, ROI. Run your facility's numbers.",
  });
}
