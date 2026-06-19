"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const VideoGenerator = dynamic(
  () => import("@/components/admin/facility-tabs/video-generator"),
  { ssr: false },
);

export default function StudioVideoPage() {
  return (
    <FacilityToolPage
      title="Video Generator"
      render={(p) => (
        <VideoGenerator
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
