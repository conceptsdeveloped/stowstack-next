"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const GoogleAdsLab = dynamic(
  () => import("@/components/admin/facility-tabs/google-ads-lab"),
  { ssr: false },
);

export default function StudioGoogleAdsPage() {
  return (
    <FacilityToolPage
      title="Google Ads Lab"
      render={(p) => (
        <GoogleAdsLab
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
