"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ChevronRight,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  Star,
  X,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

interface CampaignEntry {
  month: string;
  spend: number;
  leads: number;
  cpl: number;
  moveIns: number;
  roas: number;
  occupancyDelta: number;
}

interface OrgFacility {
  id: string;
  name: string;
  location: string;
  status: string;
  occupancy_range: string;
  total_units: string;
  google_rating: number | null;
  review_count: number | null;
  created_at: string;
  campaigns: CampaignEntry[] | null;
  live_pages: number;
  live_ads: number;
}

const STATUS_COLORS: Record<string, string> = {
  intake: "bg-black/[0.04] text-[#9CA3AF]",
  scraped: "bg-blue-500/10 text-blue-400",
  briefed: "bg-indigo-500/10 text-indigo-400",
  generating: "bg-purple-500/10 text-purple-400",
  review: "bg-amber-500/10 text-amber-400",
  approved: "bg-emerald-500/10 text-emerald-400",
  live: "bg-green-500/10 text-green-400",
  reporting: "bg-teal-500/10 text-teal-400",
};

const OCCUPANCY_LABELS: Record<string, string> = {
  "below-60": "Below 60%",
  "60-75": "60\u201375%",
  "75-85": "75\u201385%",
  "85-95": "85\u201395%",
  "above-95": "Above 95%",
};

export default function FacilitiesPage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [facilities, setFacilities] = useState<OrgFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<OrgFacility | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchFacilities = useCallback(async () => {
    if (!session) return;
    try {
      const res = await authFetch("/api/org-facilities");
      if (res.ok) {
        const data = await res.json();
        setFacilities(data.facilities || []);
      }
    } catch {
      // handled by authFetch
    }
    setLoading(false);
  }, [session, authFetch]);

  useEffect(() => {
    fetchFacilities();
  }, [fetchFacilities]);

  const addFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newLocation.trim()) return;
    setAdding(true);
    try {
      const res = await authFetch("/api/org-facilities", {
        method: "POST",
        body: JSON.stringify({
          name: newName.trim(),
          location: newLocation.trim(),
        }),
      });
      if (res.ok) {
        setNewName("");
        setNewLocation("");
        setShowAddForm(false);
        fetchFacilities();
      }
    } catch {
      // handled by authFetch
    }
    setAdding(false);
  };

  const removeFacility = async (id: string) => {
    try {
      await authFetch(`/api/org-facilities?id=${id}`, { method: "DELETE" });
      setSelectedFacility(null);
      fetchFacilities();
    } catch {
      // handled by authFetch
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-[#9CA3AF]" />
      </div>
    );
  }

  if (selectedFacility) {
    const f = selectedFacility;
    const campaigns = f.campaigns || [];
    const totals = campaigns.reduce(
      (acc, c) => ({
        spend: acc.spend + Number(c.spend),
        leads: acc.leads + Number(c.leads),
        moveIns: acc.moveIns + Number(c.moveIns),
      }),
      { spend: 0, leads: 0, moveIns: 0 },
    );

    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedFacility(null)}
          className="flex items-center gap-1 text-sm text-[#6B7280] transition-colors hover:text-[#111827]"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Back to facilities
        </button>

        <div className="rounded-xl border border-black/[0.08] bg-white p-6">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#111827]">{f.name}</h2>
              <p className="mt-1 flex items-center gap-1 text-sm text-[#9CA3AF]">
                <MapPin className="h-3 w-3" />
                {f.location}
              </p>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${STATUS_COLORS[f.status] || STATUS_COLORS.intake}`}
            >
              {f.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-black/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                Units
              </p>
              <p className="mt-1 text-lg font-bold text-[#111827]">
                {f.total_units || "N/A"}
              </p>
            </div>
            <div className="rounded-lg bg-black/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                Occupancy
              </p>
              <p className="mt-1 text-lg font-bold text-[#111827]">
                {OCCUPANCY_LABELS[f.occupancy_range] || f.occupancy_range || "N/A"}
              </p>
            </div>
            <div className="rounded-lg bg-black/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                Rating
              </p>
              <p className="mt-1 flex items-center gap-1 text-lg font-bold text-[#111827]">
                {f.google_rating ? (
                  <>
                    <Star className="h-4 w-4 text-amber-400" />
                    {f.google_rating}
                  </>
                ) : (
                  "N/A"
                )}
              </p>
            </div>
            <div className="rounded-lg bg-black/[0.03] p-3">
              <p className="text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                Live Pages
              </p>
              <p className="mt-1 text-lg font-bold text-[#111827]">
                {f.live_pages}
              </p>
            </div>
          </div>
        </div>

        {campaigns.length > 0 && (
          <div className="rounded-xl border border-black/[0.08] bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#111827]">
              Campaign History
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/[0.08]">
                    {["Month", "Spend", "Leads", "CPL", "Move-Ins", "ROAS"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-2 text-right text-xs font-medium text-[#9CA3AF] first:text-left"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr
                      key={c.month}
                      className="border-b border-black/[0.06] last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium text-[#111827]">
                        {c.month}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#6B7280]">
                        ${Number(c.spend).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#6B7280]">
                        {c.leads}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#6B7280]">
                        ${Number(c.cpl).toFixed(0)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[#6B7280]">
                        {c.moveIns}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium ${
                          Number(c.roas) >= 3 ? "text-emerald-400" : "text-[#6B7280]"
                        }`}
                      >
                        {Number(c.roas).toFixed(1)}x
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-black/[0.08] bg-black/[0.02]">
                    <td className="px-4 py-2.5 font-semibold text-[#111827]">
                      Total
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#111827]">
                      ${totals.spend.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#111827]">
                      {totals.leads}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#111827]">
                      ${totals.leads > 0 ? (totals.spend / totals.leads).toFixed(0) : "0"}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#111827]">
                      {totals.moveIns}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[#9CA3AF]">
                      --
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={() => removeFacility(f.id)}
          className="rounded-lg bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
        >
          Remove Facility
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#6B7280]">
          {facilities.length} {facilities.length === 1 ? "facility" : "facilities"}
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-2 text-sm font-medium text-[#111827] transition-colors hover:bg-[#E5E7EB]"
        >
          <Plus className="h-4 w-4" />
          Add Facility
        </button>
      </div>

      {showAddForm && (
        <form
          onSubmit={addFacility}
          className="rounded-xl border border-black/[0.08] bg-white p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#111827]">
              Add New Facility
            </h3>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-[#9CA3AF] hover:text-[#6B7280]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Facility name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-lg border border-black/[0.08] bg-[#F3F4F6] px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#3B82F6]"
            />
            <input
              type="text"
              placeholder="City, State"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
              className="rounded-lg border border-black/[0.08] bg-[#F3F4F6] px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:border-[#3B82F6]"
            />
          </div>
          <button
            type="submit"
            disabled={adding || !newName.trim() || !newLocation.trim()}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-sm font-medium text-[#111827] transition-colors hover:bg-[#E5E7EB] disabled:opacity-50"
          >
            {adding ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              "Add Facility"
            )}
          </button>
        </form>
      )}

      {facilities.length === 0 ? (
        <div className="rounded-xl border border-black/[0.08] bg-white py-16 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8 text-[#9CA3AF]" />
          <p className="text-sm text-[#6B7280]">No facilities yet</p>
          <p className="mt-1 text-xs text-[#9CA3AF]">
            Add your first facility to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {facilities.map((f) => {
            const totalLeads = (f.campaigns || []).reduce(
              (s, c) => s + Number(c.leads),
              0,
            );
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFacility(f)}
                className="flex w-full items-center justify-between rounded-xl border border-black/[0.08] bg-white p-4 text-left transition-colors hover:border-black/[0.1] hover:bg-[#F3F4F6]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#111827]">
                      {f.name}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[f.status] || STATUS_COLORS.intake}`}
                    >
                      {f.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-[#9CA3AF]">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {f.location}
                    </span>
                    {f.occupancy_range && (
                      <span>
                        {OCCUPANCY_LABELS[f.occupancy_range] || f.occupancy_range}
                      </span>
                    )}
                    {totalLeads > 0 && <span>{totalLeads} leads</span>}
                    {f.live_pages > 0 && <span>{f.live_pages} pages</span>}
                  </div>
                </div>
                <ChevronRight className="ml-2 h-4 w-4 shrink-0 text-[#9CA3AF]" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
