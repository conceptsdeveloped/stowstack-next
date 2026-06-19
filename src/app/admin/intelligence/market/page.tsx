"use client";

import dynamic from "next/dynamic";
import { FacilityToolPage } from "@/components/admin/facility-tool-page";

const MarketIntelligence = dynamic(
  () => import("@/components/admin/facility-tabs/market-intelligence"),
  { ssr: false },
);

export default function IntelligenceMarketPage() {
  return (
    <FacilityToolPage
      title="Market Intelligence"
      render={(p) => (
        <MarketIntelligence
          {...{ facilityId: p.facilityId, adminKey: p.adminKey, facilityName: p.facilityName }}
        />
      )}
    />
  );
}
