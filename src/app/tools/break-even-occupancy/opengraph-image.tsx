import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("Break-Even Occupancy");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "Break-Even Occupancy",
    subtitle: "The occupancy you need to cover operating costs, and the loan too.",
  });
}
