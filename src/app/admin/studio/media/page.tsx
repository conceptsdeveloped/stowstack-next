"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const MediaLibrary = dynamic(
  () => import("@/components/admin/facility-tabs/media-library"),
  { ssr: false },
);

export default function StudioMediaPage() {
  return (
    <FacilityToolPage
      title="Media Library"
      render={(p) => (
        <MediaLibrary
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
