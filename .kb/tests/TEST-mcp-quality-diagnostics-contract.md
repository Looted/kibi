---
id: TEST-mcp-quality-diagnostics-contract
title: MCP quality diagnostics contract tests
status: passing
source: packages/mcp/tests/tools/check.test.ts
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Validates `kb_check` structured output and text output for hard violations and advisory `qualityDiagnostics[]`.
