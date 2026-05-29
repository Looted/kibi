---
id: SCEN-mcp-model-requirement-v1
title: MCP model_requirement returns strict or observation write plans
type: scenario
status: active
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
source: packages/mcp/tests/tools/model-requirement.test.ts
tags: [mcp, model-requirement]
links:
  - type: verified_by
    target: TEST-mcp-model-requirement
---

The MCP model_requirement tool extracts normative claims, chooses strict-lane write sets for high-confidence claims, and falls back to review observations for low-confidence claims.
