import type { Metadata } from "next";
import { PortalShell } from "@/components/portal/portal-shell";

export const metadata: Metadata = {
  title: "Client Portal | StorageAds",
  description:
    "Access your StorageAds dashboard — attribution, campaign performance, and facility analytics.",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell>{children}</PortalShell>;
}
