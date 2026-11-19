---
title: A list or report read over 64,000 characters is refused
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-result-ceiling
type: scenario
---
Given a list or report read whose data stays over 64,000 characters after its cut, when it returns, then the call fails with RESULT_TOO_LARGE and no data; a bounded output of the same size is returned whole.

The suites of TEST-kibi-result-budget exercise it.