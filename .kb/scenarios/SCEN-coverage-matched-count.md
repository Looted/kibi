---
title: kb_coverage reports how many rows match its filters
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-coverage-matched-count
type: scenario
---
Given a kb_coverage page of a larger report, when it runs, then matched is the number of rows its filters select and the truncation total equals it.

The suites of TEST-kibi-result-budget exercise it.