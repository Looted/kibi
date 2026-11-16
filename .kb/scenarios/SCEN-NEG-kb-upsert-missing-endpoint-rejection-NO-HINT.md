---
title: A missing-endpoint refusal without the fix is caught
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T13:40:37.009Z'
id: SCEN-NEG-kb-upsert-missing-endpoint-rejection-NO-HINT
type: scenario
---
Given upsertFailure receives the store's entity_not_found error for a missing source or target, when its message leaves out the entity, whether it is the source or the target, or that it must be created first or written in the same kb_apply_plan, then the contradiction tests fail. packages/cli/tests/operations-mutation/mutation/contradictions.test.ts exercises it.