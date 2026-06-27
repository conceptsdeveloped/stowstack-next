import { toolOgImage, ogSize, ogContentType, ogAlt } from "@/components/tools/tool-og-image";

export const alt = ogAlt("Lease-Up & Stabilization");
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return toolOgImage({
    title: "Lease-Up Calculator",
    subtitle: "Months to stabilized occupancy from your move-in pace and churn.",
  });
}
