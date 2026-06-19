"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const GBPFull = dynamic(
  () => import("@/components/admin/facility-tabs/gbp-full"),
  { ssr: false },
);

export default function ChannelsGbpPage() {
  return (
    <FacilityToolPage
      title="Google Business"
      render={(p) => (
        <GBPFull
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
