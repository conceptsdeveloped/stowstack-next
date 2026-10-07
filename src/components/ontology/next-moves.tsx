"use client";

import Link from "next/link";
import { Stamp } from "@/components/instrument-calm/stamp";
import { RULE_STAMPS } from "@/lib/ontology/registry";
import type { Move, Ontology } from "@/lib/ontology/types";
import { actionHref } from "./use-ontology";

/**
 * What the links reveal, one sentence each, with one way to close it.
 * Instrument Calm (library entry 008): a repeated action is never a button on
 * every row; the whole row is the target, its stamp says what the action does,
 * and the action is named at the end like a nav link ("Write an ad →").
 * Calm by construction: no badge, no red, nothing animated.
 */
export function NextMoves({
  ontology,
  limit = 5,
  toolsBase = "/portal/tools",
}: {
  ontology: Ontology;
  limit?: number;
  toolsBase?: string;
}) {
  const moves = ontology.moves.slice(0, limit);
  const more = ontology.moves.length - moves.length;
  const known = new Set(ontology.objects.map((o) => o.address));

  if (moves.length === 0) {
    return (
      <div className="border-t-[1.5px] border-[var(--ic-line-spine)] pt-3 text-[15px] font-semibold text-[var(--ic-ink-secondary)]">
        Nothing needs you right now.
      </div>
    );
  }

  return (
    <div className="border-t-[1.5px] border-[var(--ic-line-spine)]">
      <ol>
        {moves.map((m) => (
          <MoveRow key={m.id} move={m} href={actionHref(m.action, known.has(m.subject) ? m.subject : null, toolsBase)} />
        ))}
      </ol>
      {more > 0 && (
        <div className="pt-3 text-[14px] font-semibold text-[var(--ic-ink-secondary)]">
          {more} more in the{" "}
          <Link href="/portal/index" className="font-extrabold text-[var(--ic-ink-primary)] underline underline-offset-4">
            index
          </Link>
          .
        </div>
      )}
    </div>
  );
}

function MoveRow({ move, href }: { move: Move; href: string }) {
  return (
    <li className="border-b border-[var(--ic-line-quiet)]">
      <Link
        href={href}
        className="group flex flex-col gap-2 py-3.5 text-[var(--ic-ink-primary)] transition-colors duration-[120ms] hover:bg-[var(--ic-ground-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ic-signal-selected)] sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="flex min-w-0 flex-1 items-start gap-3">
          <Stamp name={RULE_STAMPS[move.rule] ?? "console"} size={24} className="mt-0.5" />
          <span className="min-w-0">
            <span className="block text-[16px] font-bold leading-snug">{move.sentence}</span>
            <span className="mt-0.5 block text-[14px] font-semibold leading-snug text-[var(--ic-ink-secondary)]">{move.reason}</span>
          </span>
        </span>
        <span className="shrink-0 pl-9 text-[15px] font-extrabold sm:pl-0">
          {move.action.label} <span aria-hidden="true">→</span>
        </span>
      </Link>
    </li>
  );
}
