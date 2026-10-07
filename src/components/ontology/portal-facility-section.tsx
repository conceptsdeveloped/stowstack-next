"use client";

import Link from "next/link";
import { usePortal } from "@/components/portal/portal-shell";
import { SectionSkeleton, ErrorState } from "@/components/portal/ui";
import { FacilityStamp, Dial, Stamp } from "@/components/instrument-calm/stamp";
import { isPortalDemo } from "@/lib/portal-demo/demo-mode";
import { LANES, TYPE_DEFS, typesInLane } from "@/lib/ontology/registry";
import type { Ontology } from "@/lib/ontology/types";
import { NextMoves } from "./next-moves";
import { indexHref, useOntology } from "./use-ontology";

/**
 * The ontology on the portal dashboard, built to the Instrument Calm kit
 * (library entry 008; COMPONENTS.md §5, §7, §10): the facility chip, a row of
 * four instrument tiles with one reading each (one solid navy dial), what
 * needs you as whole-row targets, and every kind of thing as a stamped list.
 *
 * Note: the site-wide `.urbit-landing` scope paints every <section> with the
 * page ground and sets every <p> to weight 300 (globals.css), so these panels
 * carry their own padding and text blocks are divs.
 */
export function PortalFacilitySection() {
  const { client, authFetch } = usePortal();
  const { data, loading, error, reload } = useOntology({ kind: "portal", facilityId: client.facilityId, authFetch });

  if (loading && !data) return <SectionSkeleton />;
  if (error || !data) return <ErrorState message={error ?? "Couldn't load your facility index."} onRetry={reload} />;

  const sample = isPortalDemo();
  return (
    <>
      <section aria-labelledby="facility-heading" className="space-y-5 p-5">
        <FacilityChip ontology={data} />
        <h2 id="facility-heading" className="sr-only">
          Your facility
        </h2>
        <InstrumentRow ontology={data} sample={sample} />
      </section>

      <section aria-labelledby="next-heading" className="p-5">
        <h2 id="next-heading" className="mb-3 text-[21px] font-extrabold leading-tight text-[var(--ic-ink-primary)]">
          Needs you
        </h2>
        <NextMoves ontology={data} />
      </section>

      <section aria-labelledby="kinds-heading" className="p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="kinds-heading" className="text-[21px] font-extrabold leading-tight text-[var(--ic-ink-primary)]">
            Everything here
          </h2>
          <Link href="/portal/index" className="text-[14px] font-extrabold text-[var(--ic-ink-primary)]">
            Open the index →
          </Link>
        </div>
        <KindsList ontology={data} />
        <div className="ic-label mt-4 border-t-[1.5px] border-[var(--ic-line-spine)] pt-2">
          {data.facility.slug} · {data.objects.length} things, one address each{sample ? " · sample data, labeled" : ""}
        </div>
      </section>
    </>
  );
}

/** COMPONENTS.md §5: a white chip, 1px ink border, the compact stamp, the name, the slug. */
export function FacilityChip({ ontology }: { ontology: Ontology }) {
  const f = ontology.facility;
  return (
    <div className="flex min-h-12 items-center gap-3 border border-[var(--ic-line-instrument)] bg-[var(--ic-ground-white)] px-2.5 py-2 text-[var(--ic-ink-primary)]">
      <FacilityStamp initials={f.initials} type={f.unitType} seq={f.seq} size={32} label={f.name} />
      <div className="min-w-0 flex-1 truncate text-[17px] font-extrabold">{f.name}</div>
      <div className="ic-label shrink-0">{f.slug}</div>
    </div>
  );
}

function InstrumentRow({ ontology, sample }: { ontology: Ontology; sample: boolean }) {
  const reading = (t: string) => ontology.summaries.find((s) => s.type === t)!.reading;
  const { total, occupied } = ontology.facility.units;
  const pct = total ? Math.round((occupied / total) * 100) : null;
  const prefix = sample ? "Sample · " : "";
  const leads = reading("leads");
  const moveIns = reading("tenants");
  const needs = ontology.moves.length;
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Instruments">
      <Tile title="Occupancy" sub={pct == null ? "Upload your unit mix" : `${prefix}${occupied} of ${total} units`} href={indexHref(null, "units")}>
        <div className="flex items-end justify-between gap-2">
          <span className="ic-reading text-[34px] leading-none md:text-[40px]">{pct == null ? "—" : `${pct}%`}</span>
          {pct != null && <Dial fraction={occupied / total} size={56} label={`Occupancy ${pct} percent`} />}
        </div>
      </Tile>
      <Tile title="Leads" sub={`${prefix}${leads.unit}`} href={indexHref(null, "leads")}>
        <span className="ic-reading text-[34px] leading-none md:text-[40px]">{leads.value}</span>
      </Tile>
      <Tile title="Move-ins" sub={`${prefix}${moveIns.unit}`} href={indexHref(null, "tenants")}>
        <span className="ic-reading text-[34px] leading-none md:text-[40px]">{moveIns.value}</span>
      </Tile>
      <Tile title="Needs you" sub={needs === 1 ? "One thing to do" : `${needs} things to do`} href="#next-heading">
        <span className="ic-reading text-[34px] leading-none text-[var(--ic-signal-reading)] md:text-[40px]">{needs}</span>
      </Tile>
    </ul>
  );
}

/** COMPONENTS.md §7: white, 1px ink border, title top-left (700, 17px), reading bottom-left, mono sub-label. */
function Tile({ title, sub, href, children }: { title: string; sub: string; href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-full min-h-[148px] flex-col justify-between gap-3 border border-[var(--ic-line-instrument)] bg-[var(--ic-ground-white)] p-3 text-[var(--ic-ink-primary)] transition-colors duration-[120ms] hover:bg-[var(--ic-ground-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ic-signal-selected)] md:p-4"
      >
        <span className="text-[17px] font-bold leading-tight">{title}</span>
        <span className="block">
          {children}
          <span className="ic-label mt-2 block leading-snug">{sub}</span>
        </span>
      </Link>
    </li>
  );
}

/** Every kind, by lane, as a stamped list (STAMPS.md: 16px stamps in dense lists, beside their words). */
function KindsList({ ontology }: { ontology: Ontology }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
      {LANES.map((lane) => (
        <div key={lane.key}>
          <div className="ic-label mb-1">{lane.label}</div>
          <ul>
            {typesInLane(lane.key).map((t) => {
              const s = ontology.summaries.find((x) => x.type === t)!;
              const def = TYPE_DEFS[t];
              return (
                <li key={t}>
                  <Link
                    href={indexHref(null, t)}
                    className="flex min-h-10 items-center gap-2.5 border-b border-[var(--ic-line-quiet)] py-1.5 text-[var(--ic-ink-primary)] transition-colors duration-[120ms] hover:bg-[var(--ic-ground-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ic-signal-selected)]"
                  >
                    <Stamp name={def.stamp} size={16} />
                    <span className="flex-1 text-[15px] font-bold">{def.plural}</span>
                    <span className="ic-reading text-[15px]">{s.reading.value}</span>
                    <span className="ic-label w-[7.5rem] shrink-0 truncate text-right">{s.reading.unit}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
