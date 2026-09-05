---
id: TEST-mcp-skills-resource-discoverability
title: Verify MCP bundled skill resource discovery
status: active
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: packages/mcp/tests/tools/skills.test.ts
links:
  - type: validates
    target: SCEN-mcp-skills-resource-discoverability
type: test
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-skills-resource-discoverability
      target: default
  success_policy: all_required_first_attempt
---

List bundled skills, load a declared resource, and attempt an undeclared path while asserting deterministic success and rejection behavior. Executable coverage spans `packages/mcp/tests/tools/skills.test.ts`.
