import type { Metadata } from "next";
import ToolJsonLd from "@/components/tools/tool-jsonld";
import NoiCalculatorClient from "./noi-calculator-client";

const title = "Self-Storage NOI Calculator";
const description =
  "Free net operating income calculator for self-storage operators. Tally storage-specific income and operating expenses — labor, property tax, utilities, insurance, management — and triangulate your NOI, expense ratio, per-unit economics, and implied facility value. Runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://storageads.com/tools/noi-calculator" },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/tools/noi-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function NoiCalculatorPage() {
  return (
    <>
      <ToolJsonLd
        name={title}
        description={description}
        url="https://storageads.com/tools/noi-calculator"
      />
      <NoiCalculatorClient />
    </>
  );
}
