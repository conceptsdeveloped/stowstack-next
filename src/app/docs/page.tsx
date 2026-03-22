import type { Metadata } from "next";
import { DocsClient } from "./docs-client";

export const metadata: Metadata = {
  title: "API Documentation — StowStack",
  description:
    "Complete REST API reference for StowStack. Manage facilities, leads, tenants, units, campaigns, and more via our V1 API.",
};

export default function DocsPage() {
  return <DocsClient />;
}
