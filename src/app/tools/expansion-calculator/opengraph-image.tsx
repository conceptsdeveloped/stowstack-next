import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("Expansion ROI");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "Expansion ROI",
    subtitle: "Yield on cost vs your cap rate on units you're thinking of building.",
  });
}
