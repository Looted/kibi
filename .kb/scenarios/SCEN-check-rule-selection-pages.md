---
title: A kb_check rule selection lists its findings in pages
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-check-rule-selection-pages
type: scenario
---
Given a kb_check with rules whose findings pass the budget, when it runs, then it lists the findings that fit from offset, states the total and the next offset, and the next page starts there.

The suites of TEST-kibi-result-budget exercise it.