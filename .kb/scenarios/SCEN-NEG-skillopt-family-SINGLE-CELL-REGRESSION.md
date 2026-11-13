---
title: A single cell's drop does not regress a family
status: active
expects: rejection
tags:
  - negative-path
  - skillopt
  - scoring
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-13, approving the requirement statements for refused .kb reads, reference answers and pooled family gates in SkillOpt scoring: "Approved"'
  recorded_at: '2026-11-13T19:10:00.000Z'
id: SCEN-NEG-skillopt-family-SINGLE-CELL-REGRESSION
type: scenario
---
Given a family with 2 cells per arm where the candidate fails both, when the campaign compares the arms, then the family is reported as underpowered and is not a regression. Given 16 cells per arm and a drop within the noise floor, then the family holds.

scripts/skillopt-eval/tests/family-gate.test.ts and scripts/skillopt-eval/tests/campaign-workflow.test.ts exercise it.