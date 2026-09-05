---
id: TEST-mcp-semantic-advisor-preflight
title: MCP semantic advisor preflight tests
status: passing
created_at: 2026-06-07T00:00:00.000Z
updated_at: 2026-06-07T00:00:00.000Z
source: packages/mcp/tests/semantic-advisor/analyze-prose.test.ts
tags:
  - mcp
  - semantic-advisor
  - modeling
  - unit
links:
  - type: validates
    target: SCEN-mcp-semantic-advisor-preflight
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-semantic-advisor-preflight
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verifies deterministic semantic advisor signal detection, modeling suggestions, ambiguity witnesses, receipt hashing, standalone `kb_semantic_advisor` behavior, `kb_validate_upsert` preflight warnings, and successful `kb_upsert` advisory receipts for prose-heavy requirements.
