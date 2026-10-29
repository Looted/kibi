---
title: Optional MCP tools stay unregistered when KIBI_MCP_OPTIONAL_TOOLS does not name them
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T20:55:04.093Z'
id: SCEN-NEG-kibi-mcp-tool-consolidation-OPTIONAL-TOOLS-UNNAMED
type: scenario
---
Given a kibi-mcp server started with KIBI_MCP_OPTIONAL_TOOLS unset, when a client lists the tools, then kb_sparql_remote and kb_job_status are absent and only the sixteen agent-facing tools are offered.

This is the failure side of the environment gate on optional tools: a session that did not opt in must not expose them. packages/mcp/tests/server/tool-surface-consumer.test.ts "lists 16 tools, routes composites to the CLI operation payload, and dry-run upserts write nothing" exercises it by asserting both names are missing from the listed tools.
