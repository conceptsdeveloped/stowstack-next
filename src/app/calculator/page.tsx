import type { Metadata } from "next";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "@/components/tools/tool-jsonld";
import { MARKETING_ROI_FAQS } from "@/lib/tools/faqs";
import MarketingRoiClient from "./marketing-roi-client";

const title = "Storage Marketing ROI Calculator";
const description =
  "Free marketing ROI calculator for self-storage operators. Enter units, occupancy, average rate, and ad budget to model the move-ins, added revenue, and return on ad spend a marketing program can produce. Runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://storageads.com/calculator" },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function CalculatorPage() {
  return (
    <>
      <ToolJsonLd
        name={title}
        description={description}
        url="https://storageads.com/calculator"
      />
      <FaqJsonLd faqs={MARKETING_ROI_FAQS} />
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "Marketing ROI Calculator",
          "https://storageads.com/calculator",
        )}
      />
      <MarketingRoiClient />
    </>
  );
}
