---
title: A rare suppression reason still gets its count in the summary
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:52:40.312Z'
id: SCEN-CASE-bootstrap-discovered-candidate-budget-REASON-UNCOUNTED
type: scenario
---
Given a bootstrap plan whose suppressed candidates are dominated by hundreds of over_limit and duplicate_title rows, with only two invalid_write rows, when the planner presents the plan, then the summary still names invalid_write with its count of 2 next to the large reasons, so no reason that has suppressed rows is left with zero counts.

The test case "hundreds of suppressions read as one count per reason in the tldr and diagnostics" in packages/cli/tests/operations/bootstrap-write-failures.test.ts exercises it. It covers the value below the bound, `lt 1`, of summary counts per suppression reason.