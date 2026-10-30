---
title: Bootstrap planning reports every discovered candidate past maxCandidates as over_limit
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T14:56:49.613Z'
id: SCEN-CASE-bootstrap-write-safety-unreported-over-limit
type: scenario
---
Given 100 discovered source-symbol candidates and 60 declared intent claims with maxCandidates 50, when bootstrap candidates are selected, then the 50 discovered candidates past the budget are not planned and each is reported as a suppressed over_limit row, with a diagnostic that counts them, so no over-limit candidate is dropped silently.

The test case packages/cli/tests/operations/bootstrap-write-failures.test.ts "declared claims are never capped and discovered candidates keep their own maxCandidates budget" exercises it; "typed extractor failures name the path and suppression reason" checks the same accounting for an extraction failure. It covers the value past the bound of unreported over-limit candidates and extraction failures, `gt 0`.