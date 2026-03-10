---
id: SCEN-008
title: Agent uses the core MCP surface while inference remains internal
status: active
created_at: 2026-02-20T08:10:00.000Z
updated_at: 2026-02-20T08:10:00.000Z
priority: must
tags:
  - inference
  - impact
  - coverage
links:
  - REQ-013
  - ADR-008
---

Steps:
1. Agent calls `kb_query` to inspect the changed requirement and nearby entities.
2. Agent uses `kb_upsert` and `kb_delete` only for deliberate KB changes.
3. Agent runs `kb_check` to validate the resulting KB state.
4. Any deeper inference or impact analysis runs outside the public MCP tool surface.
