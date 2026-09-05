---
id: TEST-mcp-kb-freshness
title: MCP same-branch KB freshness tests
status: passing
created_at: 2026-07-20T00:00:00.000Z
updated_at: 2026-07-20T00:00:00.000Z
source: packages/mcp/tests/server/kb-freshness.test.ts
tags:
  - mcp
  - branch
  - freshness
  - integration
links:
  - type: validates
    target: SCEN-mcp-kb-freshness
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-kb-freshness
      target: default
  success_policy: all_required_first_attempt
type: test
---

Verifies that the MCP session refreshes an externally replaced same-branch KB attachment and fails closed when refresh reconciliation cannot complete.
