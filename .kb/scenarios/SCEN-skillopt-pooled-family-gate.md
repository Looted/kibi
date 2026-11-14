---
title: A family regresses only on a pooled drop beyond its noise floor
status: active
tags:
  - skillopt
  - scoring
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: SCEN-skillopt-pooled-family-gate
type: scenario
---
Given baseline runs whose two halves pass a family at 14 and 12 of 16 cells, when `noise-floor.ts` measures the floor, then the family's floor is 0.125. Given that floor and at least 16 cells per arm, when a candidate passes 23 of 32 cells against the baseline's 26 of 32, then the family holds; at 8 of 32 it regresses.

scripts/skillopt-eval/tests/family-gate.test.ts exercises it.