import type { Metadata } from "next";
import { DataDeletionClient } from "./data-deletion-client";

export const metadata: Metadata = {
  title: "Data Deletion",
  description:
    "Request deletion of your data from StorageAds systems. Required for Meta advertising compliance.",
};

export default function DataDeletionPage() {
  return <DataDeletionClient />;
}
