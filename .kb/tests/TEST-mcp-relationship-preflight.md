---
id: TEST-mcp-relationship-preflight
title: Verify MCP relationship preflight diagnostics
status: active
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: packages/mcp/tests/tools/validate-upsert.test.ts
links:
  - type: validates
    target: SCEN-mcp-relationship-preflight
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-relationship-preflight
      target: default
  success_policy: all_required_first_attempt
---

Submit malformed relationship tuples, missing targets, and source mismatches and assert that validation rejects them with stable diagnostics before persistence. Executable coverage spans `packages/mcp/tests/tools/validate-upsert.test.ts`, `packages/mcp/tests/tools/upsert.test.ts`, and `packages/mcp/tests/tools/relationship-validation.test.ts`.
