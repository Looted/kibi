---
title: The two routes return the same data for a call
status: active
fact_kind: property_value
subject_key: kibi.operation_result
property_key: mcp_cli_data_differences
operator: eq
value_type: int
value_int: 0
tags:
  - lane:strict
  - fact:property_value
  - result-budget
origin:
  kind: agent
  recorded_at: '2026-11-19T16:00:00.000Z'
claim_key: CLAIM-4A0E9621569BCC52
claim_text: An MCP tool result and the CLI JSON result of the same call must carry the same data
text_ref: REQ-result-route-parity
id: FACT-result-route-parity
type: fact
---
For the same call, the data of the MCP tool result and the CLI JSON result do not differ, including a result cut to the budget. Grounds the clause of REQ-result-route-parity.