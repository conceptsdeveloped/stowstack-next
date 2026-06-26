"use client";

import dynamic from "next/dynamic";
import { useFacility } from "@/lib/facility-context";
import { useAdmin } from "@/lib/admin-context";

const EcriFinder = dynamic(
  () => import("@/components/admin/facility-tabs/ecri-finder"),
  { ssr: false },
);
const EcriPortfolio = dynamic(
  () => import("@/components/admin/facility-tabs/ecri-portfolio"),
  { ssr: false },
);

/**
 * ECRI route. At "all" scope it renders the portfolio roll-up across every
 * facility; with a facility selected it renders the per-facility finder. (We
 * branch directly on scope rather than using FacilityToolPage's select-a-
 * facility gate, because the all-scope view is meaningful here.)
 */
export default function IntelligenceEcriPage() {
  const { current, currentId } = useFacility();
  const { adminKey } = useAdmin();

  if (currentId === "all" || current === "all") {
    return <EcriPortfolio adminKey={adminKey ?? ""} />;
  }

  return (
    <EcriFinder
      key={currentId}
      facilityId={currentId}
      facilityName={current.name}
      adminKey={adminKey ?? ""}
    />
  );
}
