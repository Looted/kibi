---
id: TEST-mcp-upsert-method-granularity
title: MCP upsert accepts method symbol granularity
status: passing
created_at: 2026-05-30T00:00:00Z
updated_at: 2026-06-01T00:00:00Z
source: packages/mcp/tests/tools/upsert.test.ts
tags: [mcp, symbols, traceability, unit]
links:
  - type: validates
    target: SCEN-symbol-granularity
---

Verifies that MCP upsert accepts traceability targeting an existing class method symbol, rejects ambiguous bare method targets, and requires explicit granularity rationale for coarse module-level symbol links.
