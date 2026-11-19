---
title: 'Failure side: the two routes return the same data for a call'
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: mcp_cli_data_differences
operator: gt
value_type: int
value_int: 0
tags:
  - negative-path
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
id: FACT-NEG-result-route-parity-ROUTES-DIFFER
type: fact
---
The failure side of REQ-result-route-parity: given the same call, data that differs between the two routes fails the parity test's assertions.