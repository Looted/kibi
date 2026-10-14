---
title: A rejected kb_compile_intent input keeps VALIDATION_FAILED on MCP as on the CLI
status: active
tags:
  - mcp
  - cli
  - parity
  - errors
origin:
  kind: agent
  ref: Onboarding test finding on MCP error codes (2026-10-14)
  recorded_at: '2026-10-14T08:56:56.497Z'
id: SCEN-mcp-coded-error-envelope
type: scenario
---
Given a fresh workspace served by the kibi-mcp binary, when a client calls kb_compile_intent with a clause that is not a verbatim fragment of the intent, then the result has isError true, structuredContent is an error envelope with status error and error.code VALIDATION_FAILED, retryable false and a message naming the clause, and the text content reads "Tool kb_compile_intent failed: [VALIDATION_FAILED] <message>". The CLI JSON route answers the same input with an error envelope whose error object is identical.

An error without a Kibi code (for example a Node error code) still fails the tool with the text "Tool <name> failed: <message>" and no envelope.
