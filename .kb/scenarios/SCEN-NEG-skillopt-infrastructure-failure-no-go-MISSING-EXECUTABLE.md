---
title: A paid optimize run whose Codex executable is missing ends in a structured infrastructure no-go
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T10:30:00.000Z'
id: SCEN-NEG-skillopt-infrastructure-failure-no-go-MISSING-EXECUTABLE
type: scenario
---
Given a clean source worktree and a paid optimize run whose runtime PATH hides the Codex executable, when the operator runs optimize with --allow-paid, then the command exits 1 with a structured no-go that names the failed stage and a reason, writes a durable no-go gate receipt, and launches no cell.

This is the failure side of infrastructure handling: a missing executable is not behavioral evidence, so it never produces an eligibility review. documentation/tests/e2e/skillopt-trust-boundaries.e2e.ts, in its second part where the stripped PATH hides the Codex executable, exercises it.
