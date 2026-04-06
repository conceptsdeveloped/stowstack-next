"use client";

import { useState } from "react";
import {
  Loader2,
  Building2,
  Clock,
  Upload,
  DollarSign,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Inbox,
} from "lucide-react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import type { PmsData } from "./pms-dashboard-types";
import { OverviewTab } from "./pms-overview-tab";
import { RentRollTab } from "./pms-rent-roll-tab";
import { AgingTab } from "./pms-aging-tab";
import { RevenueTab } from "./pms-revenue-tab";
import { LengthOfStayTab } from "./pms-length-of-stay-tab";
import { UploadTab } from "./pms-upload-tab";
import { PmsQueueTab } from "./pms-queue-tab";

/* ── Sub-tab types and config ── */

type SubTab =
  | "overview"
  | "rent_roll"
  | "aging"
  | "revenue"
  | "length_of_stay"
  | "upload"
  | "queue";

const SUB_TABS: { key: SubTab; label: string; icon: typeof Building2 }[] = [
  { key: "overview", label: "Occupancy Overview", icon: Building2 },
  { key: "rent_roll", label: "Rent Roll", icon: FileSpreadsheet },
  { key: "aging", label: "Aging", icon: AlertTriangle },
  { key: "revenue", label: "Revenue", icon: DollarSign },
  { key: "length_of_stay", label: "Length of Stay", icon: Clock },
  { key: "upload", label: "Upload", icon: Upload },
  { key: "queue", label: "Client Uploads", icon: Inbox },
];

/* ── Main component ── */

interface Props {
  facilityId: string;
  adminKey: string;
}

export default function PmsDashboard({ facilityId }: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>("overview");

  const { data, loading, error, refetch } = useAdminFetch<PmsData>(
    "/api/pms-data",
    { facilityId }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-gold)]" />
        <span className="ml-3 text-[var(--color-body-text)]">Loading PMS data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-[var(--color-gold)] text-[var(--color-light)] rounded-lg text-sm hover:bg-[var(--color-gold)]/80 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--border-subtle)]">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition ${
                active
                  ? "bg-[var(--color-light-gray)] text-[var(--color-dark)] border-b-2 border-[var(--color-gold)]"
                  : "text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
        <button
          onClick={refetch}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition"
          title="Refresh data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab data={data} />}
      {activeTab === "rent_roll" && <RentRollTab data={data} />}
      {activeTab === "aging" && <AgingTab data={data} />}
      {activeTab === "revenue" && <RevenueTab data={data} />}
      {activeTab === "length_of_stay" && <LengthOfStayTab data={data} />}
      {activeTab === "upload" && (
        <UploadTab facilityId={facilityId} onImported={refetch} />
      )}
      {activeTab === "queue" && (
        <PmsQueueTab facilityId={facilityId} onImported={refetch} />
      )}
    </div>
  );
}
