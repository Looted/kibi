---
title: A safe-mutation final state missing the requested coverage link is not credited
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:31.025Z'
id: SCEN-NEG-skillopt-logical-evidence-fidelity-MISSING-COVERAGE-LINK
type: scenario
---
Given a safe-mutation evaluator manifest and a final state that lacks the requested coverage relationship, when the cell evidence is sealed, then the final-safe-mutation-direction claim is false, while the complete final state scores it true.

This is the failure side of exact final-state scoring: a mutation that only partly creates the requested ownership and coverage links must not pass. scripts/skillopt-eval/tests/default-cell-evidence.test.ts "requires the exact public safe-mutation ownership and coverage links" exercises it.
