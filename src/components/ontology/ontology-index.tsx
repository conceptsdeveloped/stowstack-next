"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { FacilityStamp, Stamp } from "@/components/instrument-calm/stamp";
import { LANES, TYPE_DEFS, TYPE_ORDER, typeOfAddress, typesInLane } from "@/lib/ontology/registry";
import type { ObjectTypeKey, Ontology, OntologyObject } from "@/lib/ontology/types";
import { actionHref } from "./use-ontology";

/**
 * The index: every object at the facility, by kind, each with its address,
 * its facts, what it is linked to, and what can be done with it. Following a
 * link walks the graph: open a unit, see the leads who asked for that size,
 * open one of them, see the page they came from.
 *
 * Built to the Instrument Calm kit (library entry 008): a report-style
 * masthead with the full facility stamp, a stamped menu where the selected
 * kind is a navy block, objects as whole-row targets, and the "Looking at"
 * inspector (COMPONENTS.md §10) carrying the view's only CTA pair.
 *
 * State lives in the URL (?t=units, ?o=units/10x10-climate) so any object can
 * be linked to, and the back button behaves.
 */
export function OntologyIndex({ ontology, toolsBase = "/portal/tools" }: { ontology: Ontology; toolsBase?: string }) {
  const byAddress = useMemo(() => new Map(ontology.objects.map((o) => [o.address, o])), [ontology]);
  const [type, setType] = useState<ObjectTypeKey>("units");
  const [open, setOpen] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Read ?o= / ?t= once, on arrival.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const o = params.get("o");
    const t = params.get("t") as ObjectTypeKey | null;
    if (o && byAddress.has(o)) {
      setType(typeOfAddress(o) ?? "units"); // eslint-disable-line react-hooks/set-state-in-effect -- URL is external state
      setOpen(o);
      requestAnimationFrame(() => document.getElementById(rowId(o))?.scrollIntoView({ block: "center" }));
    } else if (t && (TYPE_ORDER as string[]).includes(t)) {
      setType(t);
    } else {
      const first = TYPE_ORDER.find((k) => ontology.summaries.find((s) => s.type === k)?.count);
      if (first) setType(first);
    }
  }, [byAddress, ontology.summaries]);

  const writeUrl = (next: { t?: ObjectTypeKey; o?: string | null }) => {
    const url = new URL(window.location.href);
    url.searchParams.delete("t");
    url.searchParams.delete("o");
    if (next.o) url.searchParams.set("o", next.o);
    else if (next.t) url.searchParams.set("t", next.t);
    window.history.replaceState(null, "", url.toString().replace(/%2F/g, "/"));
  };

  const selectType = useCallback((t: ObjectTypeKey) => {
    setType(t);
    setOpen(null);
    writeUrl({ t });
    listRef.current?.focus({ preventScroll: true });
  }, []);

  const goTo = useCallback(
    (address: string) => {
      const t = typeOfAddress(address);
      if (!t || !byAddress.has(address)) return;
      setType(t);
      setOpen(address);
      writeUrl({ o: address });
      requestAnimationFrame(() => document.getElementById(rowId(address))?.scrollIntoView({ block: "start", behavior: "smooth" }));
    },
    [byAddress],
  );

  const toggle = (address: string) => {
    const next = open === address ? null : address;
    setOpen(next);
    writeUrl(next ? { o: next } : { t: type });
  };

  const f = ontology.facility;
  const def = TYPE_DEFS[type];
  const summary = ontology.summaries.find((s) => s.type === type)!;
  const objects = ontology.objects.filter((o) => o.type === type);

  return (
    <div className="space-y-6 text-[var(--ic-ink-primary)]">
      <header className="flex items-center gap-4 border-b-[1.5px] border-[var(--ic-line-spine)] pb-4">
        <FacilityStamp initials={f.initials} type={f.unitType} seq={f.seq} size={64} label={f.name} />
        <div className="min-w-0">
          <div className="ic-label">Index</div>
          <h1 className="truncate text-[28px] font-extrabold leading-tight tracking-[-0.015em] md:text-[32px]">{f.name}</h1>
          <div className="ic-label mt-0.5">
            {f.slug} · {f.units.total.toLocaleString("en-US")} units · {ontology.objects.length} things
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)]">
        <KindMenu ontology={ontology} selected={type} onSelect={selectType} />

        <section aria-labelledby="index-type" ref={listRef} tabIndex={-1} className="min-w-0 outline-none">
          <div className="flex items-start gap-3 border-b-[1.5px] border-[var(--ic-line-spine)] pb-3">
            <Stamp name={def.stamp} size={32} className="mt-0.5" />
            <div className="min-w-0">
              <h2 id="index-type" className="text-[24px] font-extrabold leading-tight">
                {def.plural} <span className="ic-reading text-[var(--ic-signal-reading)]">{summary.count}</span>
              </h2>
              <div className="mt-1 text-[15px] font-semibold text-[var(--ic-ink-secondary)]">
                {def.definition} {summary.reading.value} {summary.reading.unit}:{" "}
                {summary.reading.definition.charAt(0).toLowerCase() + summary.reading.definition.slice(1)}
              </div>
            </div>
          </div>

          {objects.length === 0 ? (
            <EmptyKind type={type} toolsBase={toolsBase} />
          ) : (
            <ul className="mt-4 space-y-2">
              {objects.map((o) => (
                <ObjectRow
                  key={o.address}
                  object={o}
                  open={open === o.address}
                  onToggle={() => toggle(o.address)}
                  byAddress={byAddress}
                  moves={ontology.moves.filter((m) => m.subject === o.address)}
                  goTo={goTo}
                  toolsBase={toolsBase}
                />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const rowId = (address: string) => `obj-${address.replace(/[^a-z0-9]+/gi, "-")}`;

/** The kinds, stamped, by lane. Selected = navy inversion with a white stamp (COMPONENTS.md §10 rail rule). */
function KindMenu({
  ontology,
  selected,
  onSelect,
}: {
  ontology: Ontology;
  selected: ObjectTypeKey;
  onSelect: (t: ObjectTypeKey) => void;
}) {
  return (
    <nav aria-label="Kinds of things" className="grid grid-cols-1 gap-x-4 gap-y-4 min-[420px]:grid-cols-2 lg:block lg:space-y-4">
      {LANES.map((lane) => (
        <div key={lane.key}>
          <div className="ic-label mb-1">{lane.label}</div>
          <ul>
            {typesInLane(lane.key).map((t) => {
              const on = t === selected;
              const count = ontology.summaries.find((s) => s.type === t)!.count;
              return (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => onSelect(t)}
                    aria-current={on ? "true" : undefined}
                    className={`flex min-h-10 w-full items-center gap-2.5 px-2 text-left transition-colors duration-[120ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ic-signal-selected)] ${
                      on
                        ? "bg-[var(--ic-signal-selected)] text-[var(--ic-signal-selected-text)]"
                        : "text-[var(--ic-ink-primary)] hover:bg-[var(--ic-ground-soft)]"
                    }`}
                  >
                    <Stamp name={TYPE_DEFS[t].stamp} size={24} />
                    <span className="flex-1 text-[15px] font-bold">{TYPE_DEFS[t].plural}</span>
                    <span className="ic-reading text-[14px]">{count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function EmptyKind({ type, toolsBase }: { type: ObjectTypeKey; toolsBase: string }) {
  const def = TYPE_DEFS[type];
  const action =
    type === "units"
      ? { label: "Upload your unit mix", href: "/portal/upload" }
      : def.tool
        ? { label: `Open ${toolLabel(def.tool)}`, href: actionHref({ label: "", tool: def.tool }, null, toolsBase) }
        : null;
  return (
    <div className="flex flex-col items-start gap-4 py-8">
      <Stamp name={def.stamp} size={64} framed />
      <div className="text-[16px] font-semibold text-[var(--ic-ink-secondary)]">No {def.plural.toLowerCase()} yet.</div>
      {action && (
        <Link href={action.href} className="text-[15px] font-extrabold">
          {action.label} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}

function toolLabel(tool: string): string {
  const labels: Record<string, string> = {
    occupancy: "Occupancy",
    revenue: "Revenue",
    funnels: "Campaign Builder",
    "ad-studio": "Ad Generator",
    "landing-pages": "Landing Pages",
    "utm-links": "Tracking Links",
    gbp: "Google Business",
    "lead-nurture": "Lead Follow-Up",
    tenants: "Tenants",
    "market-intel": "Competitors",
  };
  return labels[tool] ?? "the tools";
}

function ObjectRow({
  object,
  open,
  onToggle,
  byAddress,
  moves,
  goTo,
  toolsBase,
}: {
  object: OntologyObject;
  open: boolean;
  onToggle: () => void;
  byAddress: Map<string, OntologyObject>;
  moves: Ontology["moves"];
  goTo: (address: string) => void;
  toolsBase: string;
}) {
  const id = rowId(object.address);
  const def = TYPE_DEFS[object.type];
  return (
    <li
      id={id}
      className={`scroll-mt-20 bg-[var(--ic-ground-white)] ${
        open ? "border-[3px] border-[var(--ic-signal-selected)]" : "border border-[var(--ic-line-quiet)] hover:border-[var(--ic-line-instrument)]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-detail`}
        className="flex w-full items-center gap-3 px-3 py-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ic-signal-selected)] sm:px-4"
      >
        <Stamp name={def.stamp} size={16} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold">{object.name}</span>
          <span className="ic-label block truncate normal-case tracking-[0.02em]">{object.address}</span>
        </span>
        {moves.length > 0 ? (
          <span className="ic-label shrink-0" style={{ color: "var(--ic-signal-selected)" }}>
            Needs you
          </span>
        ) : (
          object.status && <span className="ic-label hidden shrink-0 sm:inline">{object.status.replace(/_/g, " ")}</span>
        )}
        <span className="ic-label hidden shrink-0 sm:inline">
          {object.links.length} {object.links.length === 1 ? "link" : "links"}
        </span>
        <span aria-hidden="true" className={`shrink-0 text-[15px] font-extrabold transition-transform duration-[120ms] ${open ? "rotate-90" : ""}`}>
          →
        </span>
      </button>

      {open && <Inspector id={`${id}-detail`} object={object} moves={moves} byAddress={byAddress} goTo={goTo} toolsBase={toolsBase} />}
    </li>
  );
}

/** COMPONENTS.md §10: LOOKING AT → title → quiet rule → stamp + name + slug → list → the CTA pair, stacked → a mono line. */
function Inspector({
  id,
  object,
  moves,
  byAddress,
  goTo,
  toolsBase,
}: {
  id: string;
  object: OntologyObject;
  moves: Ontology["moves"];
  byAddress: Map<string, OntologyObject>;
  goTo: (address: string) => void;
  toolsBase: string;
}) {
  const def = TYPE_DEFS[object.type];
  const [primary, secondary, ...rest] = object.actions;
  return (
    <div id={id} className="space-y-5 border-t border-[var(--ic-line-quiet)] px-3 pb-5 pt-4 sm:px-5">
      <div>
        <div className="ic-label">Looking at · {def.singular}</div>
        <div className="mt-1 text-[24px] font-extrabold leading-tight">{object.name}</div>
      </div>
      <div className="flex items-center gap-3 border-t border-[var(--ic-line-quiet)] pt-4">
        <Stamp name={def.stamp} size={48} framed />
        <div className="min-w-0">
          <div className="text-[17px] font-extrabold leading-snug">{object.brief}</div>
          <div className="ic-label mt-0.5 normal-case tracking-[0.02em]">
            {object.address}
            {object.status ? ` · ${object.status.replace(/_/g, " ")}` : ""}
          </div>
        </div>
      </div>

      {moves.length > 0 && (
        <div>
          <div className="ic-label mb-1.5" style={{ color: "var(--ic-signal-selected)" }}>
            Needs you
          </div>
          <TreeList items={moves.map((m) => ({ key: m.id, title: m.sentence, note: m.reason }))} />
        </div>
      )}

      {object.facts.length > 0 && (
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
          {object.facts.map((fact) => (
            <div key={fact.label} className="contents">
              <dt className="ic-label sm:pt-1">{fact.label}</dt>
              <dd className="-mt-1.5 text-[15px] font-semibold sm:mt-0">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <Links object={object} byAddress={byAddress} goTo={goTo} />

      {primary && (
        <div className="flex max-w-md flex-col gap-2.5">
          <Link href={actionHref(primary, object.address, toolsBase)} className="ic-cta ic-cta--filled w-full">
            {primary.label}
          </Link>
          {secondary && (
            <Link href={actionHref(secondary, object.address, toolsBase)} className="ic-cta ic-cta--ghost w-full">
              {secondary.label}
            </Link>
          )}
          {rest.map((a) => (
            <Link key={a.label} href={actionHref(a, object.address, toolsBase)} className="text-[15px] font-extrabold">
              {a.label} <span aria-hidden="true">→</span>
            </Link>
          ))}
          <div className="ic-label mt-1">Opens the tool with this loaded. Nothing changes until you save there.</div>
        </div>
      )}
      <CopyAddress address={object.address} />
    </div>
  );
}

/** Box-drawing bullets stand in for icons in lists (COMPONENTS.md §9). */
function TreeList({ items }: { items: { key: string; title: string; note?: string }[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={item.key} className="flex gap-2.5">
          <span aria-hidden="true" className="ic-label shrink-0 pt-0.5 text-[14px]">
            {i === items.length - 1 ? "└─" : "├─"}
          </span>
          <span>
            <span className="block text-[15px] font-bold">{item.title}</span>
            {item.note && <span className="block text-[14px] font-semibold text-[var(--ic-ink-secondary)]">{item.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Links({
  object,
  byAddress,
  goTo,
}: {
  object: OntologyObject;
  byAddress: Map<string, OntologyObject>;
  goTo: (address: string) => void;
}) {
  if (object.links.length === 0) {
    return <div className="text-[14px] font-semibold text-[var(--ic-ink-secondary)]">Not linked to anything yet.</div>;
  }
  const groups = TYPE_ORDER.map((t) => ({
    type: t,
    items: object.links.map((a) => byAddress.get(a)).filter((o): o is OntologyObject => !!o && o.type === t),
  })).filter((g) => g.items.length);
  return (
    <div className="space-y-3">
      <div className="ic-label">Linked to</div>
      {groups.map((g) => (
        <div key={g.type}>
          <div className="mb-1 flex items-center gap-2 text-[14px] font-extrabold">
            <Stamp name={TYPE_DEFS[g.type].stamp} size={16} />
            {TYPE_DEFS[g.type].plural}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pl-6">
            {g.items.slice(0, 12).map((o) => (
              <li key={o.address}>
                <button
                  type="button"
                  onClick={() => goTo(o.address)}
                  className="max-w-[16rem] truncate text-left text-[14px] font-bold underline decoration-[var(--ic-line-quiet)] decoration-2 underline-offset-4 hover:decoration-[var(--ic-ink-primary)]"
                >
                  {o.name}
                </button>
              </li>
            ))}
            {g.items.length > 12 && <li className="text-[14px] font-semibold text-[var(--ic-ink-secondary)]">and {g.items.length - 12} more</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

function CopyAddress({ address }: { address: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(address).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        });
      }}
      className="text-[14px] font-extrabold underline underline-offset-4"
    >
      {done ? "Copied" : "Copy the address"}
    </button>
  );
}
