---
id: TEST-012
title: kb_query supports sourceFile filtering for linked entities
status: active
created_at: 2026-02-20T10:35:00.000Z
updated_at: 2026-02-20T10:35:00.000Z
priority: must
tags:
  - mcp
  - context
links:
  - type: validates
    target: REQ-015
---

Validation steps:
1. Seed KB entities with `source` values matching a project file path.
2. Call `kb_query` with `sourceFile` set to that path substring.
3. Verify the matching entities are returned in deterministic order.
