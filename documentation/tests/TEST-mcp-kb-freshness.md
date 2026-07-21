---
id: TEST-mcp-kb-freshness
title: MCP same-branch KB freshness tests
status: passing
created_at: 2026-07-20T00:00:00Z
updated_at: 2026-07-20T00:00:00Z
source: packages/mcp/tests/server/kb-freshness.test.ts
tags: [mcp, branch, freshness, integration]
links:
  - type: validates
    target: SCEN-mcp-kb-freshness
---

Verifies that the MCP session refreshes an externally replaced same-branch KB attachment and fails closed when refresh reconciliation cannot complete.
