import type { Metadata } from "next";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "@/components/tools/tool-jsonld";
import { BREAK_EVEN_FAQS } from "@/lib/tools/faqs";
import BreakEvenClient from "./break-even-client";

const title = "Self-Storage Break-Even Occupancy Calculator";
const description =
  "Find the occupancy your self-storage facility needs to cover operating expenses and debt service. Enter units, average rate, and monthly costs to see your operating and all-in break-even, plus your cushion. Free, runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: "https://storageads.com/tools/break-even-occupancy",
  },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/tools/break-even-occupancy",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function BreakEvenOccupancyPage() {
  return (
    <>
      <ToolJsonLd
        name={title}
        description={description}
        url="https://storageads.com/tools/break-even-occupancy"
      />
      <FaqJsonLd faqs={BREAK_EVEN_FAQS} />
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "Break-Even Occupancy",
          "https://storageads.com/tools/break-even-occupancy",
        )}
      />
      <BreakEvenClient />
    </>
  );
}
