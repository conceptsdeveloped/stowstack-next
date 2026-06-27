import type { Metadata } from "next";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "@/components/tools/tool-jsonld";
import { RATE_INCREASE_FAQS } from "@/lib/tools/faqs";
import RateIncreaseClient from "./rate-increase-client";

const title = "Storage Rate Increase (ECRI) Impact Calculator";
const description =
  "Model the net revenue a self-storage existing-customer rate increase actually adds after move-outs, plus the break-even move-out rate and the implied value lift at your cap rate. Free, runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://storageads.com/tools/rate-increase-calculator",
  },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/tools/rate-increase-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function RateIncreaseCalculatorPage() {
  return (
    <>
      <ToolJsonLd
        name={title}
        description={description}
        url="https://storageads.com/tools/rate-increase-calculator"
      />
      <FaqJsonLd faqs={RATE_INCREASE_FAQS} />
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "Rate Increase (ECRI) Impact",
          "https://storageads.com/tools/rate-increase-calculator",
        )}
      />
      <RateIncreaseClient />
    </>
  );
}
