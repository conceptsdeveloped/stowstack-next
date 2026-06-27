import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("Concession True-Cost");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "Concession True-Cost",
    subtitle: "What a free month really costs over a tenant's lifetime.",
  });
}
