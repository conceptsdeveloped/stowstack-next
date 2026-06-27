import type { Metadata } from "next";
import ToolJsonLd, {
  FaqJsonLd,
  BreadcrumbJsonLd,
  toolBreadcrumb,
} from "@/components/tools/tool-jsonld";
import { LEASE_UP_FAQS } from "@/lib/tools/faqs";
import LeaseUpClient from "./lease-up-client";

const title = "Self-Storage Lease-Up Calculator";
const description =
  "Free lease-up calculator for self-storage. Estimate months to stabilized occupancy from your current occupancy, monthly move-in pace, and move-out rate, and see when your pace can't reach the target at all. Runs in your browser.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://storageads.com/tools/lease-up-calculator" },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/tools/lease-up-calculator",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

export default function LeaseUpCalculatorPage() {
  return (
    <>
      <ToolJsonLd
        name={title}
        description={description}
        url="https://storageads.com/tools/lease-up-calculator"
      />
      <FaqJsonLd faqs={LEASE_UP_FAQS} />
      <BreadcrumbJsonLd
        items={toolBreadcrumb(
          "Lease-Up & Stabilization",
          "https://storageads.com/tools/lease-up-calculator",
        )}
      />
      <LeaseUpClient />
    </>
  );
}
