import type { Metadata } from "next";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "@/components/tools/tool-jsonld";
import { VALUATION_FAQS } from "@/lib/tools/faqs";
import ValuationClient from "./valuation-client";

const title = "Self-Storage Valuation & Cap Rate Calculator";
const description =
  "Value a self-storage facility on a cap rate. Solve for value, cap rate, or NOI from the other two, plus value per unit and per square foot. Free, runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://storageads.com/tools/valuation-calculator",
  },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/tools/valuation-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function ValuationCalculatorPage() {
  return (
    <>
      <ToolJsonLd
        name={title}
        description={description}
        url="https://storageads.com/tools/valuation-calculator"
      />
      <FaqJsonLd faqs={VALUATION_FAQS} />
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "Valuation & Cap Rate",
          "https://storageads.com/tools/valuation-calculator",
        )}
      />
      <ValuationClient />
    </>
  );
}
