---
id: TEST-kibi-change-to-proof-plan-compiler
title: Change-to-proof plan compiler verification
type: test
status: passing
created_at: 2026-08-13T00:00:00.000Z
updated_at: 2026-08-13T00:00:00.000Z
source: documentation/tests/TEST-kibi-change-to-proof-plan-compiler.md
priority: must
verification_scope: end_to_end
verification_perspective: consumer
tags:
  - planning
  - requirements
  - contradiction
  - traceability
  - test
links:
  - type: validates
    target: SCEN-kibi-change-to-proof-plan-compiler
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-change-to-proof-plan-compiler
      target: default
  success_policy: all_required_first_attempt
---

Operation tests verify deterministic plan hashes, one disposition per assertive clause, contradiction and ontology-gap abstentions, dependency ordering, sequential apply behavior, and rejection of stale plan hashes. MCP and CLI fixtures assert the same planning and mutation contracts.
