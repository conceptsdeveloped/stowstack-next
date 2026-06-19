"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const AdStudio = dynamic(
  () => import("@/components/admin/facility-tabs/ad-studio"),
  { ssr: false },
);

export default function StudioAdGeneratorPage() {
  return (
    <FacilityToolPage
      title="Ad Generator"
      render={(p) => (
        <AdStudio facilityId={p.facilityId} adminKey={p.adminKey} facilityName={p.facilityName} />
      )}
    />
  );
}
