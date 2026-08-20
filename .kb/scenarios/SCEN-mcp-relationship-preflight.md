---
id: SCEN-mcp-relationship-preflight
title: MCP rejects invalid relationship targets before persistence
status: active
created_at: 2026-08-18T00:00:00Z
updated_at: 2026-08-18T00:00:00Z
source: documentation/scenarios/SCEN-mcp-relationship-preflight.md
tags: [mcp, relationships, validation]
links:
  - type: verified_by
    target: TEST-mcp-relationship-preflight
---

Given an MCP mutation that includes a malformed relationship tuple, a missing target, or a type-incompatible source/target pair, when relationship preflight runs, then the mutation is rejected before persistence and the diagnostic names the invalid edge plus an actionable alternative.
