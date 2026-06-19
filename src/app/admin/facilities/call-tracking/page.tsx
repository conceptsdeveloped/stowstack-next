"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const CallTracking = dynamic(
  () => import("@/components/admin/facility-tabs/call-tracking"),
  { ssr: false },
);

export default function FacilitiesCallTrackingPage() {
  return (
    <FacilityToolPage
      title="Call Tracking"
      render={(p) => (
        <CallTracking
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
