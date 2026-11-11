---
title: A coverage row that is not proven always names its gaps and ranked repairs
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-10T15:00:00.000Z'
id: SCEN-NEG-kibi-proof-outcome-and-repair-guidance-SILENT-GAP
type: scenario
---
Given a requirement whose structural coverage fields are filled but whose evidence does not reach a proof, when the packed CLI reports coverage, then the row's proofStatus is not proven and the row lists stable gap codes with ranked repair actions, instead of leaving the structural fields to read as a proof.

This is the failure side of reporting proof separately with repair guidance. documentation/tests/e2e/packed/coverage-proof-status.test.ts "reports non-proven proofStatus with stable gaps and ranked repairs" exercises it.
