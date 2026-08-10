---
id: TEST-mcp-suggest-predicates
title: Predicate suggestion MCP tool behavior tests
status: passing
created_at: 2026-05-30T00:00:00Z
updated_at: 2026-06-01T00:00:00Z
source: packages/mcp/tests/tools/suggest-predicates.test.ts
tags: [mcp, ontology, predicates, unit]
links:
  - type: validates
    target: SCEN-mcp-suggest-predicates
---

Verifies predicate candidate ranking, safe apply-plan generation, existing schema loading, relationship guidance, argument validation, declared-schema argument binding, prohibition polarity preservation, and ontology-gap fallback behavior for `kb_suggest_predicates`.
