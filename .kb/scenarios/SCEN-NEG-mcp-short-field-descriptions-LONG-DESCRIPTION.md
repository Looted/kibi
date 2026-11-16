---
title: A field description over 120 characters fails the tool surface tests
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-16T06:40:14.971Z'
id: SCEN-NEG-mcp-short-field-descriptions-LONG-DESCRIPTION
type: scenario
---
Given an operation spec that adds an input field whose description is longer than 120 characters and has no shorter advertised description, when the tool surface tests list the MCP tools, then they fail and name the field, so the long text cannot reach a host's context unnoticed. packages/mcp/tests/server/tool-surface-consumer.test.ts and packages/cli/tests/operations/advertised-schema.test.ts exercise it.