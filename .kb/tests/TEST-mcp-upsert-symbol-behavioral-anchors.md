---
id: TEST-mcp-upsert-symbol-behavioral-anchors
title: MCP upsert enforces behavioral symbol granularity
status: passing
created_at: 2026-06-06T00:00:00Z
updated_at: 2026-06-06T00:00:00Z
source: packages/mcp/tests/tools/upsert.test.ts
tags: [mcp, symbols, traceability, unit]
links:
  - type: validates
    target: SCEN-symbol-behavioral-anchors
---

Verifies that MCP upsert accepts coarse traceability when only type-shape symbols are available, still rejects coarse links when behavioral symbols exist, and accepts explicit granularity reasons for intentional coarse links.
