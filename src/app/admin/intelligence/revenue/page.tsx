"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const RevenueAnalytics = dynamic(
  () => import("@/components/admin/facility-tabs/revenue-analytics"),
  { ssr: false },
);

export default function IntelligenceRevenuePage() {
  return (
    <FacilityToolPage
      title="Revenue Analytics"
      render={(p) => (
        <RevenueAnalytics
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
