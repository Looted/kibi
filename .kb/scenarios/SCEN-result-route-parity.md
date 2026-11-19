---
title: An MCP tool result and the CLI JSON result carry the same data
status: active
expects: success
tags:
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: SCEN-result-route-parity
type: scenario
---
Given a kb_query whose full rows pass the budget, when it is called over MCP and the CLI JSON route, then both return the same cut data, diagnostics and next actions.

The suites of TEST-kibi-result-budget exercise it.