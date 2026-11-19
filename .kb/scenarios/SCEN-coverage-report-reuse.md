---
title: A repeated kb_coverage call reuses its report
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-coverage-report-reuse
type: scenario
---
Given two kb_coverage calls minutes apart on the same store, when they run, then both pass the engine the same check time, so the report is computed once.

The suites of TEST-kibi-result-budget exercise it.