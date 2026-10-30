---
title: A deterministic bootstrap failure after one commit is terminal and reports the committed action
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:57:02.617Z'
id: SCEN-CASE-bootstrap-write-safety-terminal-failure-after-commit
type: scenario
---
Given an approved bootstrap plan of two ADR upserts whose second commit fails with a deterministic entity validation error, when the plan is applied, then the apply is rejected, the action results report the one action already applied, the recovery journal is marked rejected, recovery refuses to replay it with BOOTSTRAP_PLAN_REJECTED, and a corrected plan of the remaining action applies.

The test case packages/cli/tests/operations/apply-plan.test.ts "a deterministic failure after a commit is terminal, reports committed actions, and permits a corrected plan" exercises it. It covers the value past the bound of committed actions unreported on terminal failure, `gt 0`.