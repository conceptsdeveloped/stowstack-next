"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const UTMLinks = dynamic(
  () => import("@/components/admin/facility-tabs/utm-links"),
  { ssr: false },
);

export default function ChannelsUtmPage() {
  return (
    <FacilityToolPage
      title="UTM Links"
      render={(p) => (
        <UTMLinks
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
