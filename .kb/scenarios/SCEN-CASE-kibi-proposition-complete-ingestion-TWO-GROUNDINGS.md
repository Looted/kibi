---
title: A requirement whose modeled claim has two grounding facts is rejected before mutation
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:53.592Z'
id: SCEN-CASE-kibi-proposition-complete-ingestion-TWO-GROUNDINGS
type: scenario
---
Given a requirement write whose single modeled claim is linked by two requires_predicate relationships to two facts that both declare its claim key, when validate-upsert checks it, then it reports one error that the modeled entries (1) must equal the logical grounding relationships (2), the write is invalid and nothing is saved.

This covers the value past the bound, `gt 1`, of the claim that every modeled proposition has exactly one grounding fact. packages/cli/tests/operations/mutation.test.ts "validate-upsert rejects a modeled proposition grounded by two facts" exercises it.
