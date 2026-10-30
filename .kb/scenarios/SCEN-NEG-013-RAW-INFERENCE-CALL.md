---
title: A raw inference tool call over MCP is refused because inference stays internal
status: active
expects: error
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:28:12.465Z'
id: SCEN-NEG-013-RAW-INFERENCE-CALL
type: scenario
---
Given an initialized repository and the packed kibi-mcp server, when a client calls tools/call for kb_infer with an inference goal, then the server answers with an error result saying the tool is not found and runs no inference.

This is the failure side of keeping deterministic inference internal: arbitrary inference predicates must not be reachable through the public MCP tools. documentation/tests/e2e/packed/traceability-gate.test.ts "refuses a raw inference tool call outside the curated MCP surface" exercises it.
