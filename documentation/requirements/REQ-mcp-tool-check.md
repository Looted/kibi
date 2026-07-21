---
id: REQ-mcp-tool-check
title: "MCP Tool: Validate integrity rules"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/mcp/src/tools/check.ts
priority: must
owner: mcp-team
tags:
  - mcp
  - kibi
  - validation
links:
  - type: specified_by
    target: SCEN-mcp-tool-check-coverage
  - type: verified_by
    target: TEST-004
---

The `kb_check` MCP tool must:

1. Execute Kibi validation rules against the current branch KB snapshot.
2. Support filtering for specific rules (e.g., `must-priority-coverage`, `symbol-traceability`).
3. Return a list of violations with clear descriptions and entity references.
4. Support being called both before and after mutations to verify integrity.
