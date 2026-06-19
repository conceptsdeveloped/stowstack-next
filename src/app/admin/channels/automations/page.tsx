"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const LeadNurtureEngine = dynamic(
  () => import("@/components/admin/facility-tabs/lead-nurture-engine"),
  { ssr: false },
);

export default function ChannelsAutomationsPage() {
  return (
    <FacilityToolPage
      title="Automations"
      render={(p) => (
        <LeadNurtureEngine
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
