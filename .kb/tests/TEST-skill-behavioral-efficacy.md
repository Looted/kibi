---
id: TEST-skill-behavioral-efficacy
title: Skill evaluator rejects unsafe or non-improving candidates
type: test
status: pending
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-07-21T00:00:00Z
source: scripts/skillopt-eval/tests/methodology-contract.test.ts
priority: must
tags: [skills, evaluation, integration, security]
links:
  - type: validates
    target: SCEN-skill-behavioral-efficacy
---

The deterministic evaluator verifies frozen run-lock and report schemas, state and protocol scoring, private-manifest isolation, evidence reconciliation, budget/retry rules, and the paired host/family adoption thresholds before live runs can produce an adoption receipt.
