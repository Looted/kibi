---
title: An invalid input is refused with the same coded error by MCP and by the CLI JSON route
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:36:10.230Z'
id: SCEN-NEG-kibi-operation-interface-parity-REJECTED-INPUT-PARITY
type: scenario
---
Given packed MCP and CLI installs and a kb_compile_intent input whose clause is not a verbatim fragment of its intent, when the input is sent as an MCP tools/call and to the compile-intent CLI JSON route, then both peers refuse it, MCP with isError and an error envelope coded VALIDATION_FAILED, and the CLI with a non-zero exit and an identical error object.

This is the failure side of peer parity: a refusal must not differ between the two surfaces any more than a success may. documentation/tests/e2e/packed/mcp-cli-operation-parity.test.ts "refuses an invalid input with the same coded error on MCP and the CLI JSON route" exercises it.
