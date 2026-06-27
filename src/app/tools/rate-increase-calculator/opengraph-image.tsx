import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("Rate Increase (ECRI) Impact");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "Rate Increase Impact",
    subtitle: "What an existing-customer rate increase nets after move-outs.",
  });
}
