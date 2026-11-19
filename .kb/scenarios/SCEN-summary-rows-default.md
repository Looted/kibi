---
title: kb_coverage and kb_query list summary rows by default
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-summary-rows-default
type: scenario
---
Given a kb_query by type and a kb_coverage call without fields, when they run, then their rows are summary rows, and with fields full they are full rows.

The suites of TEST-kibi-result-budget exercise it.