---
id: SCEN-mcp-suggest-predicates
title: MCP suggests predicate facts or ontology-gap observations
status: active
created_at: 2026-06-01T00:00:00Z
updated_at: 2026-06-01T00:00:00Z
source: packages/mcp/tests/tools/suggest-predicates.test.ts
tags: [mcp, ontology, predicates]
links:
  - type: verified_by
    target: TEST-mcp-suggest-predicates
---

Given requirement prose and the current predicate schema catalog, the MCP suggestion tool ranks suitable predicates, returns safe predicate fact apply plans and relationship guidance when a candidate fits, and falls back to an ontology-gap observation when no schema meets the score threshold.
