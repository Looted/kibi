---
title: A cut result says what it left out and how to page on
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-result-budget-paging-notice
type: scenario
---
Given a list result past the budget, when it is cut, then truncation states the rows returned and omitted and the next offset, a RESULT_TRUNCATED diagnostic is added and a next action repeats the call with that offset.

The suites of TEST-kibi-result-budget exercise it.