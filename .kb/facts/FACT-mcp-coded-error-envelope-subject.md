---
title: MCP coded error envelope
status: active
origin:
  kind: agent
  ref: Onboarding test finding on MCP error codes (2026-10-14)
  recorded_at: '2026-10-14T08:56:39.148Z'
fact_kind: subject
subject_key: mcp.coded_error_envelope
id: FACT-mcp-coded-error-envelope-subject
type: fact
---

The shape of a failed MCP tool call that carries a Kibi error code: the same code, message and retryability the CLI's JSON route returns for that failure. It covers coded failures only, not successful results or transport errors.
