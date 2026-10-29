---
title: A paid SkillOpt launch without its gates fails closed
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:04:41.617Z'
id: SCEN-NEG-skillopt-paid-launch-accounting-UNPAID-OPTIMIZE
type: scenario
---
Given a private artifact root, when the operator runs optimize without --allow-paid, or without the bounded cell runtime, or with the Codex executable missing from PATH, then the command exits 2, 2 and 1 respectively, naming the missing gate, and no model is launched.

This is the failure side of paid launch accounting: a paid launch must fail closed unless every trust gate is satisfied. documentation/tests/e2e/skillopt-trust-boundaries.e2e.ts, in its second part where the paid optimize lane fails closed at every gate, exercises it.
