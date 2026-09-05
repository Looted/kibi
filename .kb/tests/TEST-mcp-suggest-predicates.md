---
id: TEST-mcp-suggest-predicates
title: Predicate suggestion MCP tool behavior tests
status: passing
created_at: 2026-05-30T00:00:00.000Z
updated_at: 2026-06-01T00:00:00.000Z
source: packages/mcp/tests/tools/suggest-predicates.test.ts
tags:
  - mcp
  - ontology
  - predicates
  - unit
links:
  - type: validates
    target: SCEN-mcp-suggest-predicates
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-suggest-predicates
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verifies predicate candidate ranking, safe apply-plan generation, existing schema loading, relationship guidance, argument validation, declared-schema argument binding, prohibition polarity preservation, and ontology-gap fallback behavior for `kb_suggest_predicates`.
