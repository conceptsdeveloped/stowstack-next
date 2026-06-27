import type { Metadata } from "next";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "@/components/tools/tool-jsonld";
import { DSCR_FAQS } from "@/lib/tools/faqs";
import DscrClient from "./dscr-client";

const title = "Self-Storage DSCR & Loan-Sizing Calculator";
const description =
  "Free DSCR and loan-sizing calculator for self-storage. Size the largest loan your NOI supports at a target debt service coverage ratio, or check the DSCR, debt yield, LTV, and post-debt cash flow on a loan you're weighing. Runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://storageads.com/tools/dscr-calculator" },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/tools/dscr-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function DscrCalculatorPage() {
  return (
    <>
      <ToolJsonLd
        name={title}
        description={description}
        url="https://storageads.com/tools/dscr-calculator"
      />
      <FaqJsonLd faqs={DSCR_FAQS} />
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "DSCR & Loan Sizing",
          "https://storageads.com/tools/dscr-calculator",
        )}
      />
      <DscrClient />
    </>
  );
}
