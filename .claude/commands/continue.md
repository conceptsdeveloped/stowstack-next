---
description: Force autonomous continuation until the current MISSION.md phase is fully complete — no stubs, no summaries, no asking permission.
argument-hint: [optional focus area, e.g. "tenant isolation tests"]
---

# CONTINUE — do not stop until the goal is complete

KEEP GOING. The task is NOT complete. Resume now and continue autonomously. You
already have permission to proceed — do NOT yield control to ask whether to keep
working. The default is forward motion.

FOCUS (if provided): $ARGUMENTS
If a focus area is given above, weight it when choosing the next unit of work.
Otherwise derive priority from MISSION.md and the gated build sequence.

## DONE means
Every acceptance criterion for the current step is satisfied end to end: zero
stubs, zero TODOs, zero placeholders, zero "left as an exercise," zero partial
implementations. Code that compiles but isn't wired is NOT done. A file that's
started is NOT done.

## These are NOT stopping points
- Finishing one file, function, or module
- Reaching a "natural pause" or "good checkpoint"
- Writing a summary of what you did
- Asking whether you should continue
- Saying "you can now…" / "next you could…" / "this provides a foundation for…"
- Hitting the smallest version that technically passes

## Loop until empty
1. Complete the next unit of work in full.
2. Immediately enumerate everything that still remains.
3. Start the next unit. Repeat from 1.

## Expand, don't minimize
Build the full scope, not the narrowest interpretation that lets you exit. If you
did a little, expound: add the missing cases, validation, error handling, wiring,
tests. Shallow-but-broad and broad-but-stubbed are both failures. Go deep AND finish.

## Prove completion before claiming it
List every acceptance criterion from MISSION.md for this step and show, item by
item, that each is fully satisfied. If you can't show that for even one item, you
are not done — keep working.

## When the explicit work runs out, find more
Empty criteria does NOT mean stop. Derive the next highest-value work:
1. Re-read the goal hierarchy (MISSION.md + gated build sequence).
2. Identify what most advances it from where the code now stands.
3. Rank by leverage: what unblocks the most downstream work, closes the biggest
   risk, or is required by the next gated step.
4. Build the top item in full. Repeat.

Where to look, in priority order:
- The next gated step, IF its predecessor is genuinely complete — open the gate
  and proceed; do not sit waiting for a go-ahead.
- Missing test coverage on what you just built, especially tenant-isolation /
  boundary cases. Untested code is unfinished code.
- Error handling, input validation, and edge cases the happy path skipped.
- Wiring: features that exist in isolation but aren't connected end to end.
- Security hardening on files you touched (authz, tenant scoping, injection surfaces).
- Gaps between what MISSION.md requires and what the code actually does now.

## Guardrails
- Every unit of work must trace to a goal in MISSION.md. If you can't name the
  goal it serves, don't do it.
- Do NOT jump a gate whose predecessor is incomplete.
- Do NOT invent out-of-scope features. Do NOT rewrite working code for taste alone.
- When you pick new work, state in one line which goal it advances and why it's
  the highest-leverage move — then execute.

## If blocked
State the single specific blocker (missing credential, or an ambiguity that would
change the architecture) and the assumption you'll proceed under — then PROCEED
under that assumption. Do not stop to ask.

## The only valid stop
Every MISSION.md objective for the current phase is fully met, proven item by item,
with no in-scope work left that would advance the goal. Short of that, there is
always a next move. Find it and make it.
