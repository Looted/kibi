---
id: TEST-010
title: Core MCP surface excludes internal inference tools
status: active
created_at: 2026-02-20T08:10:00.000Z
updated_at: 2026-04-24T08:12:00.000Z
priority: must
tags:
  - mcp
  - inference
  - integration
links:
  - type: validates
    target: SCEN-008
type: test
---
Verify that the public MCP catalog advertises the approved read, validation, mutation, bootstrap-planning, and briefing operations, while internal inference helpers remain unadvertised. Bootstrap uses kb_plan_bootstrap and kb_apply_plan with exact plan approval.
