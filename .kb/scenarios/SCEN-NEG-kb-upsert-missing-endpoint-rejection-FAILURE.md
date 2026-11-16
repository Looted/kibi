---
title: A missing endpoint reported as a Kibi fault is caught
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T13:40:33.743Z'
id: SCEN-NEG-kb-upsert-missing-endpoint-rejection-FAILURE
type: scenario
---
Given upsertFailure receives the store's entity_not_found error for a missing target, when the error it returns is not a RELATIONSHIP_ENDPOINT_MISSING rejection, then the contradiction tests fail, so telemetry never counts this refusal as a Kibi fault. packages/cli/tests/operations-mutation/mutation/contradictions.test.ts exercises it.