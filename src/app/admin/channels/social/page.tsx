"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const SocialCommandCenter = dynamic(
  () => import("@/components/admin/facility-tabs/social-command-center"),
  { ssr: false },
);

export default function ChannelsSocialPage() {
  return (
    <FacilityToolPage
      title="Social"
      render={(p) => (
        <SocialCommandCenter
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
