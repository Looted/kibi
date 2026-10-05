---
title: Entity origin round-trips through kb_upsert and approval gaps are reported as advisories
status: passing
tags:
  - origin
  - provenance
  - approval
  - upsert
  - checks
verification_scope: integration
verification_perspective: internal
text_ref: packages/cli/tests/commands/entity-origin.test.ts; packages/cli/tests/public/origin-review.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:21:16.397Z'
id: TEST-kibi-entity-origin
type: test
---
# Entity origin round-trips through kb_upsert and approval gaps are reported as advisories

Runs `packages/cli/tests/commands/entity-origin.test.ts` (a new entity written without origin is recorded as agent-authored and round-trips; an update without origin never overwrites the stored origin; an entity without origin stays without one; an explicit origin is stored as given with the write time filled in; an unknown origin kind is rejected before anything is written) and `packages/cli/tests/public/origin-review.test.ts` (the `exception-unapproved`, `exception-approval-self-attested` and `agent-requirement-unapproved` advisories).
