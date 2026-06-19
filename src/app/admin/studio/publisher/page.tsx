"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const AdPublisher = dynamic(
  () => import("@/components/admin/facility-tabs/ad-publisher"),
  { ssr: false },
);

export default function StudioPublisherPage() {
  return (
    <FacilityToolPage
      title="Publisher"
      render={(p) => <AdPublisher facilityId={p.facilityId} adminKey={p.adminKey} />}
    />
  );
}
