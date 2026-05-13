---
id: REQ-mcp-tool-upsert
title: "MCP Tool: Create or update entities and relationships"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/mcp/src/tools/upsert.ts
priority: must
owner: mcp-team
tags:
  - mcp
  - kibi
  - mutation
links:
  - type: implements
    target: SYM-handleKbUpsert
  - type: specified_by
    target: SCEN-mcp-tool-upsert
  - type: verified_by
    target: TEST-mcp-tool-upsert
---

The `kb_upsert` MCP tool must:

1. Allow agents to create or update a single entity with its metadata.
2. Support batch creation of relationships to other existing entities in the same call.
3. Validate relationship types against the supported canonical list.
4. Enforce requirement consistency by rejecting writes that contradict existing requirements, unless a `supersedes` relationship is provided.
5. Trigger a refresh of symbol coordinates if the upsert affects symbol linkage.
