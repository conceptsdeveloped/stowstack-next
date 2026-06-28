{
  "cmd": "/next",
  "task": "After finishing a unit of work, find the next relevant one and do it. Compute relevance from the code you just changed — never from a backlog you guess at.",
  "discover": [
    "Anchor: `git diff --name-only HEAD` (add unstaged with plain `git diff --name-only`). These changed files are the surface.",
    "Zone: open each changed file, follow its imports and exports one hop out. That neighborhood is where the next work lives.",
    "Gaps: `grep -rEn \"TODO|FIXME|not implemented\"` over the zone; flag any export with no matching *.test.ts assertion.",
    "Gate: read MISSION.md. Current gate = lowest unchecked step. At/below it is in scope; above it is forbidden."
  ],
  "choose": [
    "A — Close the gap you opened: a changed export is untested, a route group is missing a verb, a Prisma field isn't surfaced through its API, a form field has no handler, or an import resolves to a stub/throw.",
    "B — Else advance the current MISSION.md step by its smallest remaining concrete item.",
    "C — Else stop. List what remains and halt. Do not manufacture work."
  ],
  "guards": [
    "Edit only files inside the current gate. Above-gate work -> stop and state what must be authorized to unlock it.",
    "OrgId stays in scope.ts; Prisma scope stays on Facility.",
    "Do not leave boundaries.test.ts red.",
    "One unit per run; lanes stay file-disjoint."
  ],
  "verify": "Run boundaries.test.ts plus the suite covering the touched files. Resolve the runner from package.json scripts.",
  "report": ["DONE: what shipped", "UNBLOCKED: what it now enables", "NEXT: the exact file/unit a follow-up /next should target"]
}
