---
id: TEST-mcp-query-relationships
title: MCP kb_query_relationships tool tests
status: active
created_at: 2026-02-18T00:00:00Z
updated_at: 2026-02-18T00:00:00Z
priority: must
tags:
  - mcp
  - test
links:
  - REQ-002
  - REQ-vscode-traceability
---

9 unit tests for `handleKbQueryRelationships` in `packages/mcp/tests/tools/query-relationships.test.ts`:
- empty result when no relationships exist
- query by `from` returns all outbound relationships
- query by `to` returns all inbound relationships
- filter by `type` returns only matching relationships
- finds `implements` relationships
- finds `covered_by` relationships
- rejects unknown relationship type
- query with no filter returns all pairs
- returns human-readable text summary
