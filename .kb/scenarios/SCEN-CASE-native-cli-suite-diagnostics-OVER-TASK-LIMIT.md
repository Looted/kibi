---
title: The native CLI sampler inspects only 256 tasks of a process that runs 300 and reports the limit
status: active
expects: rejection
tags:
  - negative-path
  - edge-case
origin:
  kind: agent
  recorded_at: '2026-10-30T15:12:18.220Z'
id: SCEN-CASE-native-cli-suite-diagnostics-OVER-TASK-LIMIT
type: scenario
---
Given a native Linux CLI command that runs 300 threads at once under the diagnostics monitor, when the sampler records its process, then no sample inspects more than 256 tasks of any process, and a sample of that process shows 256 tasks inspected with taskLimitReached true.

This covers the value past the bound, `gt 256`, of the claim that sampling takes at most 256 tasks per process. scripts/tests/swipl-spike-diagnostics.test.ts "a process with more than 256 tasks has only 256 inspected and the limit reported" exercises it.
