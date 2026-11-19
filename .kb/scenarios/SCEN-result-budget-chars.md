---
title: An operation result keeps its data within 24,000 characters
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-result-budget-chars
type: scenario
---
Given an operation whose rows or report would pass 24,000 characters, when it is called over MCP or the CLI JSON route, then the data it returns is at most 24,000 characters.

The suites of TEST-kibi-result-budget exercise it.