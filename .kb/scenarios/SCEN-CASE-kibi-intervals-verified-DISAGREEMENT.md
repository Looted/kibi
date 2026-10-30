---
title: A disagreement on one generated differential case fails the differential run
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:36:54.431Z'
id: SCEN-CASE-kibi-intervals-verified-DISAGREEMENT
type: scenario
---
Given the seeded differential cases and one side, intervals.pl, that answers a single case differently from the Lean model's executable and the CLP(Q) and CLP(FD) oracle, when scripts/intervals-differential.ts compares the three answers, then the run exits 1, reports exactly one disagreement and prints the case with each side's answer.

This covers the edge case of one generated differential case with a disagreement, the value past the bound `gt 0`: the run fails instead of passing. documentation/tests/e2e/intervals-differential-planted.e2e.ts, in its second and third parts where a planted single-case disagreement is counted and reported, exercises it.
