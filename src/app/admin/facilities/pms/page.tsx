"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const PmsDashboard = dynamic(
  () => import("@/components/admin/facility-tabs/pms-dashboard"),
  { ssr: false },
);

export default function FacilitiesPmsPage() {
  return (
    <FacilityToolPage
      title="PMS Data"
      render={(p) => (
        <PmsDashboard
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
