---
title: A bound with no scenario past it is refused the tested status
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-30T15:00:00.000Z'
id: SCEN-NEG-kibi-case-coverage-UNCOVERED
type: scenario
---
Given a requirement whose claim bounds a batch at five files and whose scenarios never assume a batch past the bound, when kibi coverage computes its proof, then it reports the uncovered_case gap for gt 5 and the requirement is not tested. A draft scenario at six files does not change that.

This is the failure side of the stage itself. packages/cli/tests/consumer/case-coverage.test.ts "the value past a bound needs a rejection scenario that assumes it" exercises it.
