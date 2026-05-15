---
id: SCEN-mcp-tool-query
title: "MCP Tool: kb_query"
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-mcp-tool-query.md
priority: must
tags:
  - mcp
  - query
links:
  - type: verified_by
    target: TEST-012
---

## Scenario: Structured Entity Query

**Given** the Kibi MCP server is running
**When** an agent calls `kb_query` with `type="req"` and `tags=["security"]`
**Then** the server must return all requirements that have the "security" tag
**And** the results must be paginated according to the provided `limit` and `offset`.
