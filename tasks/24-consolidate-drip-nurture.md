# Task 24: Consolidate parallel drip + nurture sequence systems

## Status: DEFERRED — bigger than initial estimate

When I read both systems carefully, they have diverged substantially:

### drip_sequences (older system)

- Single table keyed on `facility_id` (one drip per facility)
- Hardcoded SEQUENCES in `src/lib/drip-sequences.ts` (post_audit, recovery)
- Funnel-based custom templates via `drip_sequence_templates` table — keyed by `(facility_id, variation_id)` for ad-variation-specific drips
- `process-drips` cron at `src/app/api/cron/process-drips/route.ts` handles SMS + email via separate code paths (`send-template`, `sms-send`)
- Wired to: `audit-approve/route.ts:244` (creates drip on audit approval), `facility-creatives/route.ts:695-828` (syncs funnel config to drip templates)

### nurture_sequences (newer system)

- 3-table normalized (sequences / enrollments / messages)
- Hardcoded SEQUENCE_TEMPLATES with full email bodies + SMS bodies
- Has templates for: landing_page_abandon, reservation_abandon, post_move_in, win_back
- **Missing**: post_audit and recovery templates that drip provides
- Wired to: `nurture-sequences/route.ts`, `cron/process-nurture/route.ts`

### Why the merge is non-trivial

1. Drip's `post_audit` and `recovery` templates aren't in nurture — need to be ported with full body content
2. Drip's funnel-based variation templates (`facility_id + variation_id` key) have no equivalent in nurture — need new nurture template structure
3. In-flight drip enrollments (keyed on facility_id) need migration to nurture_enrollments (keyed on enrollment_id)
4. `audit-approve` flow is on the critical lead-nurture path — breaking it loses post-audit follow-ups
5. `facility-creatives` syncs funnel configs to drip templates — needs nurture equivalent
6. `src/lib/drip-sequences.ts` exports `SEQUENCES` and `DripStep` type used by cron

## Steps when executing

1. Port `post_audit` and `recovery` from `lib/drip-sequences.ts` into nurture's `SEQUENCE_TEMPLATES` with full body content
2. Add a funnel-variation template type to nurture (or accept that facility-creatives stays on drip for now)
3. Refactor `audit-approve/route.ts:244-249` to call nurture's `action=enroll` endpoint
4. Refactor `facility-creatives/route.ts:695-828` to use nurture templates (or keep drip system specifically for this case)
5. Update `cron/process-drips` to also handle nurture enrollments, OR migrate all enrollments before deleting drip
6. Remove `drip_sequences` + `drip_sequence_templates` models from schema
7. Delete `api/drip-sequences/route.ts`, `cron/process-drips/route.ts`, `lib/drip-sequences.ts`
8. Remove cron entry from `vercel.json`
9. Verify build + manually test audit-approve email flow end-to-end (use verify skill)

## Estimated work: 2-3 focused hours, requires manual verification of post-audit email send

## Commit message (when executed)

```
refactor: consolidate drip + nurture into single sequence system

Ported post_audit + recovery templates from drip to nurture.
Migrated audit-approve and facility-creatives consumers.
Removed drip system (lib + routes + models + cron).
```
