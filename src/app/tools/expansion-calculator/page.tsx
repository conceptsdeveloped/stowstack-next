import type { Metadata } from "next";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "@/components/tools/tool-jsonld";
import { EXPANSION_FAQS } from "@/lib/tools/faqs";
import ExpansionClient from "./expansion-client";

const title = "Self-Storage Expansion ROI Calculator";
const description =
  "Free expansion ROI calculator for self-storage. Test whether building more units pays: yield on cost vs your cap rate, added NOI, value created, and the development spread. Runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://storageads.com/tools/expansion-calculator" },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/tools/expansion-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function ExpansionCalculatorPage() {
  return (
    <>
      <ToolJsonLd
        name={title}
        description={description}
        url="https://storageads.com/tools/expansion-calculator"
      />
      <FaqJsonLd faqs={EXPANSION_FAQS} />
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "Expansion ROI",
          "https://storageads.com/tools/expansion-calculator",
        )}
      />
      <ExpansionClient />
    </>
  );
}
