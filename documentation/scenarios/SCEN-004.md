---
id: SCEN-004
title: LLM agent upserts new requirement via MCP and KB validates schema
status: active
created_at: 2026-02-18T13:12:25.000Z
updated_at: 2026-02-18T13:12:25.000Z
priority: must
tags:
  - mcp
  - upsert
  - validation
links:
  - REQ-002
  - REQ-011
---

Steps:
1. Agent sends `kb_upsert` with `{ type: "req", id: "REQ-NEW", title: "...", status: "active", priority: "must" }`
2. MCP server validates against changeset schema (required fields present, status enum valid)
3. Prolog asserts `kb_entity(REQ-NEW, req, Props)` and persists to RDF
4. Agent receives `{ success: true }` response
5. Subsequent `kb_query` returns the new entity
