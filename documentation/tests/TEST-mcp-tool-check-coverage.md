---
id: TEST-mcp-tool-check-coverage
title: Verify filtered MCP integrity checks
status: active
created_at: 2026-05-13T00:00:00Z
updated_at: 2026-05-13T00:00:00Z
priority: must
links:
  - type: validates
    target: REQ-mcp-tool-check
  - type: validates
    target: SCEN-mcp-tool-check-coverage
---

Call `kb_check` before and after a controlled repair with a focused rule filter, asserting machine-readable violations include the affected entity and disappear after the repair.
