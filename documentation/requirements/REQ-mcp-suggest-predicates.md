---
id: REQ-mcp-suggest-predicates
title: Suggest ontology predicates from requirement prose
status: open
created_at: 2026-05-30T00:00:00Z
updated_at: 2026-06-01T00:00:00Z
source: packages/mcp/src/tools/suggest-predicates.ts
priority: high
tags:
  - mcp
  - ontology
  - predicates
links:
  - type: specified_by
    target: SCEN-mcp-suggest-predicates
  - type: verified_by
    target: TEST-mcp-suggest-predicates
---

The MCP server must suggest matching ontology predicate schemas for requirement prose, return safe predicate fact apply plans when a schema fits, and report ontology-gap observations when no candidate is suitable.
