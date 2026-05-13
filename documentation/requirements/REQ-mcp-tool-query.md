---
id: REQ-mcp-tool-query
title: "MCP Tool: Execute filtered entity queries"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/mcp/src/tools/query.ts
priority: must
owner: mcp-team
tags:
  - mcp
  - kibi
  - query
links:
  - type: implements
    target: SYM-handleKbQuery
  - type: specified_by
    target: SCEN-mcp-tool-query
  - type: verified_by
    target: TEST-mcp-tool-query
---

The `kb_query` MCP tool must:

1. Allow agents to retrieve entities from the knowledge base using structured filters (id, type, sourceFile, tags).
2. Support pagination via `limit` and `offset` parameters.
3. Return entities in a structured format suitable for model consumption.
4. Correctly handle missing entities by returning an empty result or appropriate error message.
