---
title: kb_coverage returns its plans as summaries by default
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-coverage-plan-summaries
type: scenario
---
Given a kb_coverage call without fields, when it runs, then it returns the plan summaries with their hint, and with fields full it returns the plans.

The suites of TEST-kibi-result-budget exercise it.