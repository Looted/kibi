---
title: A compile plan applies all-or-nothing and an interrupted application is settled by the next mutating call
status: active
priority: must
tags:
  - planning
  - apply-plan
  - atomic
  - recovery
origin:
  kind: agent
  recorded_at: '2026-10-04T02:20:05.545Z'
id: SCEN-kibi-plan-apply-atomic
type: scenario
---
# A compile plan applies all-or-nothing and an interrupted application is settled by the next mutating call

Given an approved compile plan whose third step the store rejects
When `kb_apply_plan` applies it with the returned plan hash
Then no step is committed, every workspace file the plan touched is restored, the error says no change was applied, and the same plan can be applied again.

Given a compile plan application that was interrupted after its journal was written
When the next `kb_apply_plan`, `kb_upsert` or `kb_delete` call runs
Then it completes or rolls back the interrupted application from the journal and reports `replayed` or `rolled_back`.

Given a journaled file that was changed outside the journal
When recovery runs
Then it changes nothing and fails with `PARTIAL_COMMIT_REPAIR_REQUIRED`.
