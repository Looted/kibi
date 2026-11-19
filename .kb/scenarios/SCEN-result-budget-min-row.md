---
title: A cut list result returns at least one row
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-result-budget-min-row
type: scenario
---
Given a list whose first row alone passes the size budget, when the result is cut, then it returns that row, cut to the budget.

The suites of TEST-kibi-result-budget exercise it.