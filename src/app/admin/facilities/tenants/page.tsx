"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const TenantManagement = dynamic(
  () => import("@/components/admin/facility-tabs/tenant-management"),
  { ssr: false },
);

export default function FacilitiesTenantsPage() {
  return (
    <FacilityToolPage
      title="Tenants"
      render={(p) => (
        <TenantManagement
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
