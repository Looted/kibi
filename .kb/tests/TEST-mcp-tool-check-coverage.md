---
id: TEST-mcp-tool-check-coverage
title: Verify filtered MCP integrity checks
status: active
created_at: 2026-05-13T00:00:00.000Z
updated_at: 2026-05-13T00:00:00.000Z
priority: must
links:
  - type: validates
    target: REQ-mcp-tool-check
  - type: validates
    target: SCEN-mcp-tool-check-coverage
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-tool-check-coverage
      target: default
  success_policy: all_required_first_attempt
type: test
---

Call `kb_check` before and after a controlled repair with a focused rule filter, asserting machine-readable violations include the affected entity and disappear after the repair.
