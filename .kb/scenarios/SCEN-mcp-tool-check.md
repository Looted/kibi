---
id: SCEN-mcp-tool-check
title: "MCP Tool: kb_check"
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
priority: must
tags:
  - mcp
  - validation
links:
  - type: verified_by
    target: TEST-004
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

## Scenario: Integrity Check Execution

**Given** the Kibi MCP server is running
**When** an agent calls `kb_check` with or without a rule filter
**Then** the server must evaluate the requested integrity checks against the current branch KB snapshot
**And** it must return violations with clear rule names and entity references.
