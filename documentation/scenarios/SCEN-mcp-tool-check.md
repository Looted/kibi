---
id: SCEN-mcp-tool-check
title: "MCP Tool: kb_check"
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-mcp-tool-check.md
priority: must
tags:
  - mcp
  - validation
links:
  - type: verified_by
    target: TEST-004
---

## Scenario: Integrity Check Execution

**Given** the Kibi MCP server is running
**When** an agent calls `kb_check` with or without a rule filter
**Then** the server must evaluate the requested integrity checks against the current branch KB snapshot
**And** it must return violations with clear rule names and entity references.
