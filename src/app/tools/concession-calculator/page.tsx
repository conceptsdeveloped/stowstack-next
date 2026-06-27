import type { Metadata } from "next";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "@/components/tools/tool-jsonld";
import { CONCESSION_FAQS } from "@/lib/tools/faqs";
import ConcessionClient from "./concession-client";

const title = "Self-Storage Concession True-Cost Calculator";
const description =
  "Free concession calculator for self-storage. See what a 'first month free' or move-in discount really costs, per move-in, per year, and as a share of a tenant's lifetime revenue. Runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://storageads.com/tools/concession-calculator" },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/tools/concession-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function ConcessionCalculatorPage() {
  return (
    <>
      <ToolJsonLd
        name={title}
        description={description}
        url="https://storageads.com/tools/concession-calculator"
      />
      <FaqJsonLd faqs={CONCESSION_FAQS} />
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "Concession True-Cost",
          "https://storageads.com/tools/concession-calculator",
        )}
      />
      <ConcessionClient />
    </>
  );
}
