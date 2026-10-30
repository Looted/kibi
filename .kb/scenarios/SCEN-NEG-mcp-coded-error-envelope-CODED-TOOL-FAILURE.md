---
title: A coded tool failure over MCP returns the coded error envelope instead of a plain error text
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:21:25.805Z'
id: SCEN-NEG-mcp-coded-error-envelope-CODED-TOOL-FAILURE
type: scenario
---
Given a kb_compile_intent call whose clause is not a verbatim fragment of the intent, when the MCP server runs it, then the call is answered with isError and a structured error envelope carrying VALIDATION_FAILED, the message and retryable false, and the CLI JSON route answers the same input with an equal error.

This is the failure side of the coded error envelope: a coded input error must not reach the client as uncoded text. packages/mcp/tests/server/tool-surface-consumer.test.ts "a rejected input keeps its Kibi error code on MCP, as on the CLI JSON route" exercises it.
