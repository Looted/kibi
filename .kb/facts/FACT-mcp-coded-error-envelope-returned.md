---
title: A coded tool failure returns an error envelope with code, message and retryability
status: active
origin:
  kind: agent
  ref: Onboarding test finding on MCP error codes (2026-10-14)
  recorded_at: '2026-10-14T08:56:44.530Z'
fact_kind: property_value
subject_key: mcp.coded_error_envelope
property_key: coded_failure_envelope
operator: eq
value_type: bool
value_bool: true
claim_key: CLAIM-5675365464CCAF0D
claim_text: The MCP server must answer a tool call that fails with a Kibi error code with an error envelope that carries the code, the message and the retryability
id: FACT-mcp-coded-error-envelope-returned
type: fact
---
