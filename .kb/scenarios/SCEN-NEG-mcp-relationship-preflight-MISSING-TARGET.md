---
title: A kb_upsert with a relationship to a missing target is rejected before the entity is persisted
status: active
expects: rejection
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-10-29T21:00:44.750Z'
id: SCEN-NEG-mcp-relationship-preflight-MISSING-TARGET
type: scenario
---
Given an MCP server over a synced KB, when an agent calls kb_upsert for a new requirement with a specified_by relationship to a scenario that does not exist, then the write fails, the diagnostic names the missing target, and the requirement is not queryable afterwards.

This is the failure side of relationship preflight: a dangling edge must not be persisted together with the entity that declares it. documentation/tests/e2e/packed/mcp-crud.test.ts "should reject a relationship to a missing target before persisting the entity" exercises it.
