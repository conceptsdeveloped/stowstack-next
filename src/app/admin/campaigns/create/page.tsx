"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CampaignWizard } from "@/components/admin/campaigns/campaign-wizard";

export default function CreateCampaignPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/campaigns"
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--color-body-text)" }}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
        >
          Create Campaign
        </h1>
      </div>

      {/* Wizard */}
      <CampaignWizard />
    </div>
  );
}
