"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const OccupancyIntelligence = dynamic(
  () => import("@/components/admin/facility-tabs/occupancy-intelligence"),
  { ssr: false },
);

export default function IntelligenceOccupancyPage() {
  return (
    <FacilityToolPage
      title="Occupancy Intelligence"
      render={(p) => (
        <OccupancyIntelligence
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
