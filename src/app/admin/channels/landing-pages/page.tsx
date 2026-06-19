"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const LandingPageBuilder = dynamic(
  () => import("@/components/admin/facility-tabs/landing-page-builder"),
  { ssr: false },
);

export default function ChannelsLandingPagesPage() {
  return (
    <FacilityToolPage
      title="Landing Pages"
      render={(p) => (
        <LandingPageBuilder
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
