---
title: A success scenario assuming a forbidden value is reported infeasible and blocks the requirement's proof
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:08:52.890Z'
id: SCEN-NEG-kibi-scenario-feasibility-v2-FORBIDDEN-ASSUMPTION
type: scenario
---
Given a current requirement that requires the remaining call quota to be above zero and a scenario that expects success while assuming a quota of zero, when kibi check runs scenario-feasibility, then the scenario is reported as a violation naming the requirement and both facts, and requirement coverage blocks the requirement with the infeasible_scenario gap until an approved exception exempts it.

This is the failure side of scenario feasibility: a scenario that promises success on forbidden input must not count as evidence. packages/cli/tests/consumer/scenario-feasibility.test.ts "flags a success scenario that assumes a forbidden value until an approved exception exempts it" exercises it.
