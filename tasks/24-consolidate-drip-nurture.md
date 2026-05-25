# Task 24: Consolidate parallel drip + nurture sequence systems

## Problem

Two parallel sequence systems exist, both with active code and crons:

- **drip_sequences** (`api/drip-sequences/route.ts`, `api/cron/process-drips/route.ts`)
- **drip_sequence_templates** (used by `facility-creatives`, `cron/process-drips`)
- **nurture_sequences** + **nurture_enrollments** + **nurture_messages** (`api/nurture-sequences/route.ts`, `api/cron/process-nurture/route.ts`)

5 models, 2 cron jobs, 2 API routes — all doing the same thing.

## Decision required (before starting)

Which system to keep:
- **Keep nurture_*** (newer, 3-table normalized: sequences/enrollments/messages — cleaner data model)
- **Keep drip_*** (older but template-driven via drip_sequence_templates)

Recommendation: **Keep `nurture_*`** — 3-table model is more flexible, and the drip system has a hard-coded SEQUENCES object in the route file rather than DB-driven templates.

## Steps

1. Confirm decision with Blake on which system to keep.
2. Find all consumer code of the losing system (grep imports and DB calls).
3. Migrate each consumer to the surviving system's API.
4. Delete the losing system's models from `prisma/schema.prisma`.
5. Delete the losing system's API routes + cron route.
6. Update `vercel.json` to remove the deleted cron entry.
7. Verify: `npx prisma validate && npx prisma generate && npx tsc --noEmit && npm run build`.
8. **Do not run `prisma db push`.** Tables can be dropped manually later once production has migrated.

## Files affected (approx)

- `prisma/schema.prisma` — remove 2-3 models
- `src/app/api/drip-sequences/route.ts` OR `src/app/api/nurture-sequences/route.ts` — delete
- `src/app/api/cron/process-drips/route.ts` OR `process-nurture/route.ts` — delete
- `vercel.json` — remove one cron entry
- Any consumer that imports the losing system

## Verification

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run build
```

## Commit message

```
refactor: consolidate drip + nurture into single sequence system

Removed parallel sequence system. Code unification only — DB tables for
removed models remain in production until manual drop after migration.
```
