---
title: Compile plans apply all-or-nothing and interrupted applications are recovered from their journal
status: passing
tags:
  - planning
  - apply-plan
  - atomic
  - journal
  - recovery
verification_scope: integration
verification_perspective: internal
text_ref: packages/cli/tests/operations/apply-plan-atomic.test.ts; packages/cli/tests/operations/apply-plan-recovery.test.ts
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:03.537Z'
id: TEST-kibi-plan-apply-atomic
type: test
---
# Compile plans apply all-or-nothing and interrupted applications are recovered from their journal

Runs `packages/cli/tests/operations/apply-plan-atomic.test.ts` against a real store (a step the store rejects inside the batch leaves the store and workspace unchanged; a step may reference an entity an earlier step creates; an application interrupted after or before the store commit is completed or rolled back by the next call; a source-write failure mid-plan restores earlier writes; journal replay is idempotent; recovery refuses, changing nothing, when a journaled file changed outside the journal; a store failure report is decided by the store) and `packages/cli/tests/operations/apply-plan-recovery.test.ts`.
