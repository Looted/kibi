---
title: Declared intent claims past maxCandidates are kept, not dropped
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:48:48.965Z'
id: SCEN-CASE-bootstrap-intent-claim-accounting-CLAIMS-OVER-CAP
type: scenario
---
Given 60 declared intent claims and 100 discovered candidates with maxCandidates 50, so that a capped planner would drop ten declared claims, when the bootstrap planner selects candidates, then every declared claim is kept (one already in the KB and one duplicate aside), only discovered candidates are suppressed as over_limit, and the diagnostics say declared intent claims do not count against the cap.

The test case "declared claims are never capped and discovered candidates keep their own maxCandidates budget" in packages/cli/tests/operations/bootstrap-write-failures.test.ts exercises it. It covers the value past the bound, `gt 0`, of declared intent claims dropped by maxCandidates.