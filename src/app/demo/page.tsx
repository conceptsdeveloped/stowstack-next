import type { Metadata } from "next";
import DemoDashboardClient from "./demo-client";

export const metadata: Metadata = {
  title: "Demo Dashboard",
  description:
    "See what a StorageAds campaign dashboard looks like with simulated data for a fictional facility.",
  openGraph: {
    title: "Demo Dashboard — StorageAds",
    description: "See what a StorageAds campaign dashboard looks like with simulated data for a fictional facility.",
    url: "https://storageads.com/demo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Demo Dashboard — StorageAds",
    description: "See what a StorageAds campaign dashboard looks like with real data.",
  },
};

export default function DemoPage() {
  return <DemoDashboardClient />;
}
