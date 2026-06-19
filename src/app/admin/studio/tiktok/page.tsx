"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const TikTokCreator = dynamic(
  () => import("@/components/admin/facility-tabs/tiktok-creator"),
  { ssr: false },
);

export default function StudioTikTokPage() {
  return (
    <FacilityToolPage
      title="TikTok Creator"
      render={(p) => (
        <TikTokCreator
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
