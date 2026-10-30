---
title: A one-variable satisfiability misdecision of intervals.pl fails the differential run
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:36:44.585Z'
id: SCEN-CASE-kibi-intervals-verified-SAT-MISDECISION
type: scenario
---
Given the seeded differential cases and an intervals.pl side that flips its answer on the first one-variable satisfiability case, when scripts/intervals-differential.ts decides the cases with intervals.pl, the Lean model's executable and the CLP(Q) and CLP(FD) oracle, then the run exits 1, counts one disagreement and prints that case with intervals.pl's answer differing from the Lean and oracle answers, which agree.

This covers the edge case of one misdecided one-variable satisfiability case, the value past the bound `gt 0`: the differential detects it and fails. documentation/tests/e2e/intervals-differential-planted.e2e.ts, in its second part where a planted satisfiability misdecision fails the run, exercises it, after its control run shows the shipped intervals.pl agrees on the same cases.
