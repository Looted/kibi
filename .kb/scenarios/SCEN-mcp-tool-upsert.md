---
id: SCEN-mcp-tool-upsert
title: "MCP Tool: kb_upsert"
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-mcp-tool-upsert.md
priority: must
tags:
  - mcp
  - mutation
links:
  - type: verified_by
    target: TEST-mcp-upsert-coverage
---

## Scenario: Entity and Relationship Mutation

**Given** the Kibi MCP server is running
**When** an agent calls `kb_upsert` for a new requirement `REQ-001`
**And** includes a `specified_by` relationship to `SCEN-001`
**Then** the server must create both the requirement and the relationship
**And** it must verify that `SCEN-001` already exists in the KB.
