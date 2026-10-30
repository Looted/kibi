---
title: A bootstrap apply that skips the progress report for an applied action fails the progress guard
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:11:32.557Z'
id: SCEN-CASE-bootstrap-apply-long-running-ACTION-WITHOUT-PROGRESS
type: scenario
---
Given an approved three-action bootstrap plan, when the apply operation runs with a progress callback, then it reports progress 0 before the first action and once after each of the three applied actions, each with total 3, and an applied action without its report fails the guard.

This covers the value past the bound, `gt 0`, of the claim that every applied action reports progress. packages/cli/tests/operations/apply-plan-interrupted-recovery.test.ts "reports per-action progress while applying" exercises it.
