import type { Metadata } from "next";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "@/components/tools/tool-jsonld";
import { NOI_FAQS } from "@/lib/tools/faqs";
import NoiCalculatorClient from "./noi-calculator-client";

const title = "Self-Storage NOI Calculator";
const description =
  "Free net operating income calculator for self-storage operators. Tally storage-specific income and operating expenses (labor, property tax, utilities, insurance, management), then triangulate your NOI, expense ratio, per-unit economics, and implied facility value. Runs in your browser.";

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
      <FaqJsonLd faqs={NOI_FAQS} />
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "NOI Calculator",
          "https://storageads.com/tools/noi-calculator",
        )}
      />
      <NoiCalculatorClient />
    </>
  );
}
