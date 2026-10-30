---
title: A requirement with one detected contradiction is blocked, not proven
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:47:00.112Z'
id: SCEN-CASE-kibi-conservative-requirement-proof-CONTRADICTION-UNBLOCKED
type: scenario
---
Given a requirement whose strict bound (remaining quota gt 0) conflicts with another current requirement (remaining quota eq 0), when coverage runs, then the contradictions stage reports blocked with outcome conflict_found and the requirement carries the blocking_contradiction gap, so one detected contradiction cannot leave proof unblocked.

The test case "reports incomplete analysis for unmodeled clauses and exact strict-bound conflicts" in packages/cli/tests/consumer/truthful-consistency.test.ts exercises it: it authors the conflicting pair through the kibi CLI and asserts the blocked stage and the blocking_contradiction gap. It covers the value past the bound, `gt 0`, of detected contradictions that do not block proof.