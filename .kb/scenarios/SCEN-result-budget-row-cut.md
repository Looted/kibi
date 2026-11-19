---
title: A row larger than the budget is cut and names what it left out
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-result-budget-row-cut
type: scenario
---
Given a single row of 30,000 characters, when its result is fitted, then the row is cut to the budget with omittedFields naming the parts left out.

The suites of TEST-kibi-result-budget exercise it.