---
title: A staged change that introduces an infeasible success scenario is blocked by the staged check
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:02:48.989Z'
id: SCEN-NEG-cli-staged-consistency-STAGED-INFEASIBLE-SCENARIO
type: scenario
---
Given a consumer workspace whose requirements forbid a zero total, when a commit stages a scenario that expects success while assuming a zero total and kibi check --staged runs, then the check refuses the commit: it exits 1 and reports the infeasible scenario the commit introduces.

This is the failure side of staged consistency: knowledge that contradicts itself must not enter through a commit. packages/cli/tests/consumer/staged-consistency.test.ts "blocks a staged infeasible scenario and ignores one already committed" exercises it.
