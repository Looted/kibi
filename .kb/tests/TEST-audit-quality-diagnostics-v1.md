---
id: TEST-audit-quality-diagnostics-v1
title: Audit quality diagnostics are covered across CLI, MCP, coverage, and OpenCode checks
status: passing
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-audit-quality-diagnostics-v1
      target: default
  success_policy: all_required_first_attempt
type: test
---

# Audit Quality Diagnostics Test Rollup

This rollup is validated by the focused CLI, MCP, coverage, and OpenCode test entities that cover the advisory diagnostic contract, quality diagnostic builders, coverage-depth labels, and scheduler surfacing.
