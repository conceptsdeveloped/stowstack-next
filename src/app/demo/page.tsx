import type { Metadata } from "next";
import DemoDashboardClient from "./demo-client";

export const metadata: Metadata = {
  title: "Demo Dashboard",
  description:
    "See what a StorageAds campaign dashboard looks like with simulated data for a fictional facility.",
};

export default function DemoPage() {
  return <DemoDashboardClient />;
}
