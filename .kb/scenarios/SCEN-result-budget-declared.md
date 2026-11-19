---
title: Every operation declares how its result keeps to the budget
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-result-budget-declared
type: scenario
---
Given the operation catalog, when the declarations are read, then every operation has one and every fitted or bounded declaration has a reason.

The suites of TEST-kibi-result-budget exercise it.