import type { Metadata } from "next";
import { DocsClient } from "./docs-client";

export const metadata: Metadata = {
  title: "API Documentation — StorageAds",
  description:
    "Complete REST API reference for StorageAds. Manage facilities, leads, tenants, units, campaigns, and more via our V1 API.",
};

export default function DocsPage() {
  return <DocsClient />;
}
