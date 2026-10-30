---
title: Hundreds of suppressions with one reason read as one count, not one entry per row
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:16.933Z'
id: SCEN-CASE-bootstrap-discovered-candidate-budget-COUNT-PER-ROW
type: scenario
---
Given a bootstrap plan with 290 candidates suppressed as over_limit, 75 as duplicate_title and 2 as invalid_write, when the planner presents the plan, then the tldr and the diagnostics give exactly one count per reason (over_limit 290, duplicate_title 75, invalid_write 2) instead of one entry per suppressed row, while the full rows stay in suppressedCandidates for review.

The test case "hundreds of suppressions read as one count per reason in the tldr and diagnostics" in packages/cli/tests/operations/bootstrap-write-failures.test.ts exercises it. It covers the value past the bound, `gt 1`, of summary counts per suppression reason.