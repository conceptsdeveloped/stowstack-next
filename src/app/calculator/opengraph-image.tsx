import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("Marketing ROI Calculator");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "Marketing ROI Calculator",
    subtitle: "Move-ins, added revenue, and ROAS from your ad budget.",
  });
}
