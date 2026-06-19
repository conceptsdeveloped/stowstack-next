"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const CreativeStudio = dynamic(
  () => import("@/components/admin/facility-tabs/creative-studio"),
  { ssr: false },
);

export default function StudioCreativePage() {
  return (
    <FacilityToolPage
      title="Creative Studio"
      render={(p) => <CreativeStudio facilityId={p.facilityId} adminKey={p.adminKey} />}
    />
  );
}
